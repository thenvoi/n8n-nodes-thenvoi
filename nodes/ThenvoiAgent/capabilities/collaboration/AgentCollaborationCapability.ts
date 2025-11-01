/**
 * Agent Collaboration Capability
 *
 * Enables AI agents to discover and add other Thenvoi agents to the chat
 * for specialized help. Provides agent context and a tool for dynamic
 * agent addition during execution.
 *
 * Priority: HIGH (25) - Runs early to fetch agent data and provide tool
 */

import { Capability, CapabilityContext, SetupResult, CapabilityPriority } from '../base/Capability';
import { HttpClient } from '@lib/http/client';
import { AgentBasicInfo, ChatParticipant } from '@lib/types';
import { fetchAvailableAgents, fetchChatParticipants } from '@lib/api';
import { AddAgentTool, AddAgentToolConfig } from '../../tools';
import { filterAgents } from '../../utils/participants';
import { getErrorMessage } from '@lib/utils/errors';
import { MessagingCapability } from '../messaging/MessagingCapability';

export class AgentCollaborationCapability implements Capability {
	readonly name = 'agent_collaboration';
	readonly priority = CapabilityPriority.HIGH;

	private availableAgents: AgentBasicInfo[] = [];
	private currentParticipants: ChatParticipant[] = [];
	private tool: AddAgentTool | null = null;

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		const httpClient = new HttpClient(ctx.credentials, ctx.execution.logger);

		try {
			await this.fetchCollaborationData(httpClient, ctx.config.chatId, ctx);

			const toolConfig = this.createToolConfiguration(httpClient, ctx.config.chatId, ctx);
			this.tool = new AddAgentTool(toolConfig);

			const metadata = this.buildSetupMetadata();

			return {
				tools: [this.tool],
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
	 * Fetches available agents and current chat participants in parallel
	 *
	 * Updates internal state with fetched data and logs initialization details.
	 * This data is required for both the tool and context augmentation.
	 *
	 * @param httpClient - HTTP client for API requests
	 * @param chatId - ID of the chat to fetch participants from
	 * @param ctx - Capability context for logging
	 */
	private async fetchCollaborationData(
		httpClient: HttpClient,
		chatId: string,
		ctx: CapabilityContext,
	): Promise<void> {
		[this.availableAgents, this.currentParticipants] = await Promise.all([
			fetchAvailableAgents(httpClient),
			fetchChatParticipants(httpClient, chatId),
		]);

		const currentAgents = filterAgents(this.currentParticipants);

		ctx.execution.logger.info('Agent collaboration capability initialized', {
			chatId,
			availableAgentsCount: this.availableAgents.length,
			currentParticipantsCount: this.currentParticipants.length,
			currentAgentsCount: currentAgents.length,
		});
	}

	/**
	 * Creates configuration object for AddAgentTool
	 *
	 * Includes all necessary dependencies and callback for updating internal state
	 * when an agent is added via the tool.
	 *
	 * @param httpClient - HTTP client for API requests
	 * @param chatId - ID of the chat where agents can be added
	 * @param ctx - Capability context for creating callback
	 * @returns Configuration object for AddAgentTool
	 */
	private createToolConfiguration(
		httpClient: HttpClient,
		chatId: string,
		ctx: CapabilityContext,
	): AddAgentToolConfig {
		return {
			httpClient,
			chatId,
			availableAgents: this.availableAgents,
			currentParticipants: this.currentParticipants,
			onAgentAdded: this.createAgentAddedCallback(ctx),
		};
	}

	/**
	 * Builds metadata object for setup result
	 *
	 * Metadata is used by the execution orchestrator to augment prompts
	 * with available agent information.
	 *
	 * @returns Metadata object with collaboration status and agent lists
	 */
	private buildSetupMetadata(): Record<string, unknown> {
		return {
			collaborationEnabled: true,
			availableAgents: this.availableAgents,
			currentAgents: filterAgents(this.currentParticipants),
		};
	}

	/**
	 * Creates callback handler for when an agent is added via tool
	 *
	 * Updates internal participants list to keep state in sync when agents
	 * are dynamically added during execution. Also notifies MessagingCapability
	 * if available so mentions work immediately. Prevents duplicate entries
	 * and logs the addition for debugging.
	 *
	 * @param ctx - Capability context for logging and registry access
	 * @returns Callback function that receives the added agent
	 */
	private createAgentAddedCallback(ctx: CapabilityContext) {
		return (agent: ChatParticipant): void => {
			const wasAlreadyInList = this.currentParticipants.some((p) => p.id === agent.id);
			if (!wasAlreadyInList) {
				this.currentParticipants.push(agent);
			}

			// Notify MessagingCapability so it can update its participants list
			// This allows mentions to work immediately without refetching
			const messagingCapability = ctx.registry?.getCapabilityByName('messaging') as
				| MessagingCapability
				| undefined;

			if (messagingCapability?.addParticipant) {
				messagingCapability.addParticipant(agent);
			}

			ctx.execution.logger.info('Agent added via tool', {
				agentId: agent.id,
				agentName: agent.name,
				wasAlreadyInList,
				currentAgentsCount: filterAgents(this.currentParticipants).length,
			});
		};
	}

	/**
	 * Get all available agents for context
	 */
	getAvailableAgents(): AgentBasicInfo[] {
		return this.availableAgents;
	}

	/**
	 * Get all current agents in the chat
	 */
	getCurrentAgents(): ChatParticipant[] {
		return filterAgents(this.currentParticipants);
	}
}
