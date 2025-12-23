import { IExecuteFunctions, Logger, NodeOperationError } from 'n8n-workflow';
import { ChatMessage } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { BaseMessage } from '@langchain/core/messages';
import { ThenvoiMemory } from '../../memory/ThenvoiMemory';
import { fetchChatMessagesWithLimit, fetchAgentContext } from '@lib/api';
import { AgentNodeConfig } from '../../types';

/**
 * Extracts recent messages from memory
 *
 * @param memory - Memory instance to load messages from
 * @param logger - Logger for error handling
 * @returns Array of messages from memory, or empty array if loading fails
 */
export async function getMessagesFromMemory(
	memory: ThenvoiMemory,
	logger: Logger,
): Promise<BaseMessage[]> {
	try {
		const memoryVariables = await memory.loadMemoryVariables({});
		const chatHistory = memoryVariables.chat_history || memoryVariables.history || [];

		if (Array.isArray(chatHistory)) {
			return chatHistory as BaseMessage[];
		}

		return [];
	} catch (error) {
		logger.warn('Failed to load messages from memory, returning empty array', { error });
		return [];
	}
}

/**
 * Fetches agent context messages (agent's messages + events)
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param limit - Maximum number of messages to fetch
 * @param logger - Logger for error handling
 * @returns Array of agent context messages
 */
async function fetchAgentContextMessages(
	httpClient: HttpClient,
	chatId: string,
	limit: number,
	logger: Logger,
): Promise<ChatMessage[]> {
	try {
		const contextResponse = await fetchAgentContext(httpClient, chatId, { pageSize: limit });
		return contextResponse.data || [];
	} catch (error) {
		logger.warn('Failed to fetch agent context messages, returning empty array', {
			chatId,
			error,
		});
		return [];
	}
}

/**
 * Fetches all text messages from the chat
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param limit - Maximum number of messages to fetch
 * @param logger - Logger for error handling
 * @returns Array of text messages
 */
async function fetchTextMessages(
	httpClient: HttpClient,
	chatId: string,
	limit: number,
	logger: Logger,
): Promise<ChatMessage[]> {
	try {
		return await fetchChatMessagesWithLimit(httpClient, chatId, limit, logger, 'text');
	} catch (error) {
		logger.warn('Failed to fetch text messages', { error });
		return [];
	}
}

/**
 * Combines and deduplicates messages by ID
 *
 * @param messages - Arrays of messages to combine
 * @returns Deduplicated array of messages
 */
function combineAndDeduplicateMessages(...messages: ChatMessage[][]): ChatMessage[] {
	const messageMap = new Map<string, ChatMessage>();

	for (const messageArray of messages) {
		messageArray.forEach((msg) => messageMap.set(msg.id, msg));
	}

	return Array.from(messageMap.values());
}

/**
 * Sorts messages by timestamp and limits to specified count
 *
 * @param messages - Array of messages to sort and limit
 * @param limit - Maximum number of messages to return
 * @returns Sorted and limited array of messages
 */
function sortAndLimitMessages(messages: ChatMessage[], limit: number): ChatMessage[] {
	return messages.sort((a, b) => a.inserted_at.getTime() - b.inserted_at.getTime()).slice(0, limit);
}

/**
 * Fetches messages from API with pagination
 *
 * When messageHistorySource === 'api', combines:
 * - /agent/chats/{id}/context - agent's messages/events (what agent sent or was mentioned in)
 * - /agent/chats/{id}/messages - all messages (user messages and others)
 *
 * This provides complete conversation context for agent rehydration.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param limit - Maximum number of messages to fetch
 * @param logger - Logger for error handling
 * @returns Array of chat messages
 */
export async function getMessagesFromAPI(
	httpClient: HttpClient,
	chatId: string,
	limit: number,
	logger: Logger,
): Promise<ChatMessage[]> {
	const [agentMessages, textMessages] = await Promise.all([
		fetchAgentContextMessages(httpClient, chatId, limit, logger),
		fetchTextMessages(httpClient, chatId, limit, logger),
	]);

	const combinedMessages = combineAndDeduplicateMessages(agentMessages, textMessages);
	return sortAndLimitMessages(combinedMessages, limit);
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
		return await getMessagesFromMemory(memory, ctx.logger);
	} else {
		return await getMessagesFromAPI(
			httpClient,
			config.chatId,
			config.messageHistoryLimit,
			ctx.logger,
		);
	}
}
