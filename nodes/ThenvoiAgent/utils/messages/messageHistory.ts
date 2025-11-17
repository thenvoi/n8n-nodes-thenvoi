import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ChatMessage } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { BaseMessage } from '@langchain/core/messages';
import { ThenvoiMemory } from '../../memory/ThenvoiMemory';
import { fetchChatMessagesWithLimit } from '@lib/api';
import { AgentNodeConfig } from '../../types';

/**
 * Extracts recent messages from memory
 */
export async function getMessagesFromMemory(memory: ThenvoiMemory): Promise<BaseMessage[]> {
	try {
		const memoryVariables = await memory.loadMemoryVariables({});
		const chatHistory = memoryVariables.chat_history || memoryVariables.history || [];

		if (Array.isArray(chatHistory)) {
			return chatHistory as BaseMessage[];
		}

		return [];
	} catch (error) {
		return [];
	}
}

/**
 * Fetches messages from API with pagination
 * Only fetches 'text' message type
 */
export async function getMessagesFromAPI(
	httpClient: HttpClient,
	chatId: string,
	limit: number,
	logger: import('n8n-workflow').Logger,
): Promise<ChatMessage[]> {
	try {
		return await fetchChatMessagesWithLimit(httpClient, chatId, limit, logger, 'text');
	} catch (error) {
		logger.warn('Failed to fetch messages from API', { error });
		return [];
	}
}

/**
 * Gets recent messages based on configuration
 * Throws error if memory required but not connected
 */
export async function getRecentMessages(
	config: AgentNodeConfig,
	memory: ThenvoiMemory | undefined,
	httpClient: HttpClient,
	ctx: IExecuteFunctions,
): Promise<BaseMessage[] | ChatMessage[]> {
	if (config.messageHistorySource === 'memory') {
		if (!memory) {
			throw new NodeOperationError(
				ctx.getNode(),
				'Message history source is set to "From Memory" but no memory node is connected. Please connect a memory node or change history source to "From API".',
			);
		}
		return await getMessagesFromMemory(memory);
	} else {
		return await getMessagesFromAPI(
			httpClient,
			config.chatId,
			config.messageHistoryLimit,
			ctx.logger,
		);
	}
}
