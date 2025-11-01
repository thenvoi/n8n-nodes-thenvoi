/**
 * Chat Context Capability
 *
 * Enables AI agents to fetch chat context on-demand:
 * - Get chat messages (with memory-checking guidance)
 * - Get chat participants (users and/or agents)
 * - Get agent information
 * - Get chat room information
 *
 * Priority: NORMAL (50) - Runs after HIGH priority capabilities like AgentCollaboration
 */

import { Capability, CapabilityContext, SetupResult, CapabilityPriority } from '../base/Capability';
import { HttpClient } from '@lib/http/client';
import { AgentBasicInfo } from '@lib/types';
import { fetchAvailableAgents } from '@lib/api';
import {
	GetChatMessagesTool,
	GetChatParticipantsTool,
	GetAgentInfoTool,
	GetChatInfoTool,
} from '../../tools';
import { getErrorMessage } from '@lib/utils/errors';

export class ChatContextCapability implements Capability {
	readonly name = 'chat_context';
	readonly priority = CapabilityPriority.NORMAL;

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		const httpClient = new HttpClient(ctx.credentials, ctx.execution.logger);

		try {
			// Fetch available agents for GetAgentInfoTool (needed to resolve agent names to IDs)
			const availableAgents = await this.fetchAvailableAgents(httpClient);

			// Create all context tools
			const tools = this.createContextTools(httpClient, ctx.config.chatId, availableAgents);

			ctx.execution.logger.info('Chat context capability initialized', {
				chatId: ctx.config.chatId,
				toolCount: tools.length,
			});

			return {
				tools,
				callbacks: [],
				metadata: {
					contextEnabled: true,
				},
			};
		} catch (error) {
			ctx.execution.logger.error('Failed to initialize chat context', { error });

			// Return empty result on error - capability is optional
			return {
				callbacks: [],
				metadata: {
					contextEnabled: false,
					error: getErrorMessage(error),
				},
			};
		}
	}

	/**
	 * Fetches available agents for agent info tool
	 *
	 * @param httpClient - HTTP client for API requests
	 * @returns Array of available agents
	 */
	private async fetchAvailableAgents(httpClient: HttpClient): Promise<AgentBasicInfo[]> {
		return await fetchAvailableAgents(httpClient);
	}

	/**
	 * Creates all context tools
	 *
	 * @param httpClient - HTTP client for API requests
	 * @param chatId - ID of the chat room
	 * @param availableAgents - Available agents for agent info tool
	 * @returns Array of context tools
	 */
	private createContextTools(
		httpClient: HttpClient,
		chatId: string,
		availableAgents: AgentBasicInfo[],
	): [GetChatMessagesTool, GetChatParticipantsTool, GetAgentInfoTool, GetChatInfoTool] {
		return [
			new GetChatMessagesTool({ httpClient, chatId }),
			new GetChatParticipantsTool({ httpClient, chatId }),
			new GetAgentInfoTool({ httpClient, availableAgents }),
			new GetChatInfoTool({ httpClient, chatId }),
		];
	}
}
