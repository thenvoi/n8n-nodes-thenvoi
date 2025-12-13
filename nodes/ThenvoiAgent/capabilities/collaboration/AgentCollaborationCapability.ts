/**
 * Agent Collaboration Capability
 *
 * Enables AI agents to discover and add other Thenvoi agents to the chat
 * for specialized help. Provides agent context and a tool for dynamic
 * agent addition during execution.
 *
 * Priority: HIGH (25) - Runs early to fetch agent data and provide tool
 */

import { fetchAllAvailableParticipants, fetchChatParticipants, fetchChatRoom } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { AvailableParticipant, ChatParticipant, RoomInfo } from '@lib/types';
import { getErrorMessage } from '@lib/utils/errors';
import {
	AddParticipantTool,
	AddParticipantToolConfig,
	ListAvailableParticipantsTool,
	ListAvailableParticipantsToolConfig,
	RemoveParticipantTool,
	RemoveParticipantToolConfig,
} from '../../tools';
import { filterAgents } from '../../utils/participants';
import { Capability, CapabilityContext, CapabilityPriority, SetupResult } from '../base/Capability';
import { MessagingCapability } from '../messaging/MessagingCapability';

export class AgentCollaborationCapability implements Capability {
	readonly name = 'agent_collaboration';
	readonly priority = CapabilityPriority.HIGH;

	private availableParticipants: AvailableParticipant[] = [];
	private currentParticipants: ChatParticipant[] = [];
	private chatRoom: RoomInfo | null = null;
	private addParticipantTool: AddParticipantTool | null = null;
	private listAvailableParticipantsTool: ListAvailableParticipantsTool | null = null;
	private removeParticipantTool: RemoveParticipantTool | null = null;

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		try {
			await this.fetchCollaborationData(ctx.httpClient, ctx.config.chatId, ctx);

			const tools = this.createTools(ctx.httpClient, ctx.config.chatId, ctx);
			const metadata = this.buildSetupMetadata();

			return {
				tools,
				callbacks: [],
				metadata,
			};
		} catch (error) {
			ctx.execution.logger.error('Failed to initialize agent collaboration', { error });

			// Return empty result on error - capability is optional
			return {
				callbacks: [],
				metadata: {
					collaborationEnabled: false,
					error: getErrorMessage(error),
				},
			};
		}
	}

	/**
	 * Fetches available participants (agents and users), current chat participants, and chat room info in parallel
	 *
	 * Updates internal state with fetched data and logs initialization details.
	 * This data is required for tools and context augmentation.
	 *
	 * @param httpClient - HTTP client for API requests
	 * @param chatId - ID of the chat to fetch data from
	 * @param ctx - Capability context for logging
	 */
	private async fetchCollaborationData(
		httpClient: HttpClient,
		chatId: string,
		ctx: CapabilityContext,
	): Promise<void> {
		[this.availableParticipants, this.currentParticipants, this.chatRoom] = await Promise.all([
			fetchAllAvailableParticipants(httpClient, chatId),
			fetchChatParticipants(httpClient, chatId),
			fetchChatRoom(httpClient, chatId),
		]);

		const currentAgents = filterAgents(this.currentParticipants);

		ctx.execution.logger.info('Agent collaboration capability initialized', {
			chatId,
			chatTitle: this.chatRoom.title,
			availableParticipantsCount: this.availableParticipants.length,
			currentParticipantsCount: this.currentParticipants.length,
			currentAgentsCount: currentAgents.length,
		});
	}

	/**
	 * Creates all collaboration tools
	 *
	 * Instantiates AddParticipantTool, ListAvailableParticipantsTool, and RemoveParticipantTool
	 * with their required configurations and callbacks.
	 *
	 * @param httpClient - HTTP client for API requests
	 * @param chatId - ID of the chat where participants can be managed
	 * @param ctx - Capability context for creating callbacks
	 * @returns Array of instantiated tools
	 */
	private createTools(
		httpClient: HttpClient,
		chatId: string,
		ctx: CapabilityContext,
	): [AddParticipantTool, ListAvailableParticipantsTool, RemoveParticipantTool] {
		const addParticipantConfig: AddParticipantToolConfig = {
			httpClient,
			chatId,
			availableParticipants: this.availableParticipants,
			currentParticipants: this.currentParticipants,
			onParticipantAdded: this.createParticipantAddedCallback(ctx),
		};

		const listAvailableConfig: ListAvailableParticipantsToolConfig = {
			httpClient,
			chatId,
		};

		const removeParticipantConfig: RemoveParticipantToolConfig = {
			httpClient,
			chatId,
			currentParticipants: this.currentParticipants,
			onParticipantRemoved: this.createParticipantRemovedCallback(ctx),
		};

		this.addParticipantTool = new AddParticipantTool(addParticipantConfig);
		this.listAvailableParticipantsTool = new ListAvailableParticipantsTool(listAvailableConfig);
		this.removeParticipantTool = new RemoveParticipantTool(removeParticipantConfig);

		return [
			this.addParticipantTool,
			this.listAvailableParticipantsTool,
			this.removeParticipantTool,
		];
	}

	/**
	 * Builds metadata object for setup result
	 *
	 * Metadata is used by the execution orchestrator to augment prompts
	 * with available agent information, chat room context, and participants.
	 *
	 * @returns Metadata object with collaboration status, agent lists, chat room, and participants
	 */
	private buildSetupMetadata(): Record<string, unknown> {
		return {
			collaborationEnabled: true,
			currentAgents: filterAgents(this.currentParticipants),
			chatRoom: this.chatRoom,
			currentParticipants: this.currentParticipants,
		};
	}

	/**
	 * Creates callback handler for when a participant is added via tool
	 *
	 * Updates internal participants list to keep state in sync when participants
	 * are dynamically added during execution. Also notifies MessagingCapability
	 * if available so mentions work immediately. Prevents duplicate entries
	 * and logs the addition for debugging.
	 *
	 * @param ctx - Capability context for logging and registry access
	 * @returns Callback function that receives the added participant
	 */
	private createParticipantAddedCallback(ctx: CapabilityContext) {
		return (participant: ChatParticipant): void => {
			const wasAlreadyInList = this.currentParticipants.some((p) => p.id === participant.id);
			if (!wasAlreadyInList) {
				this.currentParticipants.push(participant);
			}

			// Notify MessagingCapability so it can update its participants list
			// This allows mentions to work immediately without refetching
			const messagingCapability = ctx.registry?.getCapabilityByName('messaging') as
				| MessagingCapability
				| undefined;

			if (messagingCapability?.addParticipant) {
				messagingCapability.addParticipant(participant);
			}

			ctx.execution.logger.info('Participant added via tool', {
				participantId: participant.id,
				participantName: participant.name,
				participantType: participant.type,
				wasAlreadyInList,
				currentParticipantsCount: this.currentParticipants.length,
			});
		};
	}

	/**
	 * Creates callback handler for when a participant is removed via tool
	 *
	 * Updates internal participants list to keep state in sync when participants
	 * are removed during execution. Logs the removal for debugging.
	 *
	 * @param ctx - Capability context for logging
	 * @returns Callback function that receives the removed participant ID
	 */
	private createParticipantRemovedCallback(ctx: CapabilityContext) {
		return (participantId: string): void => {
			const participant = this.currentParticipants.find((p) => p.id === participantId);

			// Note: The tool already removes from its own list, but we also track it here
			const index = this.currentParticipants.findIndex((p) => p.id === participantId);
			if (index !== -1) {
				this.currentParticipants.splice(index, 1);
			}

			ctx.execution.logger.info('Participant removed via tool', {
				participantId,
				participantName: participant?.name || 'Unknown',
				participantType: participant?.type || 'Unknown',
				currentParticipantsCount: this.currentParticipants.length,
			});
		};
	}

	/**
	 * Get all current agents in the chat
	 */
	getCurrentAgents(): ChatParticipant[] {
		return filterAgents(this.currentParticipants);
	}
}
