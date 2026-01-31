import {
	ChatMessageType,
	ChatMessageMention,
	ChatEventType,
	ThenvoiTextRequest,
	ThenvoiEventRequest,
	ChatMessage,
	RawChatMessage,
} from '../types';
import { includeProperty } from '../utils';
import { HttpClient } from '../http/client';
import { fetchPaginated } from '../utils/pagination';
import { Logger } from 'n8n-workflow';

/**
 * Sends a text message to the Thenvoi API /messages endpoint
 *
 * Text messages require mentions array with at least one mention.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param content - Message content
 * @param mentions - Array of mentions (required, must have at least one)
 * @returns API response data
 */
export async function sendTextMessageToThenvoi(
	httpClient: HttpClient,
	chatId: string,
	content: string,
	mentions: ChatMessageMention[],
): Promise<unknown> {
	const body = buildTextPayload(content, mentions);

	return await httpClient.post(`/agent/chats/${chatId}/messages`, body);
}

/**
 * Sends an event to the Thenvoi API /events endpoint
 *
 * Events are non-text message types (tool_call, tool_result, thought, etc.)
 * that do not require mention validation.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param eventType - Type of event to send
 * @param content - Event content
 * @param metadata - Optional metadata for the event
 * @returns API response data
 */
export async function sendEventToThenvoi(
	httpClient: HttpClient,
	chatId: string,
	eventType: ChatEventType,
	content: string,
	metadata?: Record<string, unknown>,
): Promise<unknown> {
	const body = buildEventPayload(eventType, content, metadata);

	return await httpClient.post(`/agent/chats/${chatId}/events`, body);
}

/**
 * Builds the text message payload for the /messages endpoint
 *
 * Constructs the request body structure required by the Thenvoi API
 * for sending text messages. Text messages require a mentions array
 * with at least one mention.
 *
 * @param content - Message content text
 * @param mentions - Array of mentions (required, must have at least one)
 * @returns Formatted request payload for /messages endpoint
 */
function buildTextPayload(content: string, mentions: ChatMessageMention[]): ThenvoiTextRequest {
	return {
		message: {
			content,
			mentions,
		},
	};
}

/**
 * Builds the event payload for the /events endpoint
 *
 * Constructs the request body structure required by the Thenvoi API
 * for sending non-text events (tool_call, tool_result, thought, etc.).
 * Events do not require mentions and support optional metadata.
 *
 * @param eventType - Type of event to send (tool_call, tool_result, thought, etc.)
 * @param content - Event content text
 * @param metadata - Optional metadata object to include in the event
 * @returns Formatted request payload for /events endpoint
 */
function buildEventPayload(
	eventType: ChatEventType,
	content: string,
	metadata?: Record<string, unknown>,
): ThenvoiEventRequest {
	return {
		event: {
			content,
			message_type: eventType,
			...(metadata ? { metadata } : {}),
		},
	};
}

/**
 * Pagination metadata structure from messages API response
 */
interface MessageMetadata {
	page: number;
	page_size: number;
	total_pages: number;
	total_count: number;
	status_filter: string | null;
}

/**
 * Fetches chat messages from the Thenvoi API
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param params - Optional query parameters:
 *   - page: Page number (default: 1)
 *   - page_size: Number of messages per page (default: 20, max: 100)
 *   - since: ISO timestamp to get messages after a certain date
 *   - message_type: Filter by message type (text, system, action, thought, etc.)
 *   - status: Filter by message status (pending, processing, processed, failed, all)
 * @returns Array of chat messages
 */
export async function fetchChatMessages(
	httpClient: HttpClient,
	chatId: string,
	params?: {
		page?: number;
		page_size?: number;
		since?: string;
		message_type?: ChatMessageType;
		status?: 'pending' | 'processing' | 'processed' | 'failed' | 'all';
	},
): Promise<ChatMessage[]> {
	const queryParams: Record<string, string> = {
		...includeProperty('page', params?.page?.toString()),
		...includeProperty('page_size', params?.page_size?.toString()),
		...includeProperty('since', params?.since),
		...includeProperty('message_type', params?.message_type),
		...includeProperty('status', params?.status),
	};

	const response = await httpClient.get<{ data: RawChatMessage[]; metadata: MessageMetadata }>(
		`/agent/chats/${chatId}/messages`,
		queryParams,
	);

	// Parse date strings to Date objects for EventData type
	return (response.data || []).map((message) => ({
		...message,
		inserted_at: new Date(message.inserted_at),
		updated_at: new Date(message.updated_at),
	})) as ChatMessage[];
}

/**
 * Fetches chat messages with limit and pagination
 *
 * Uses generic pagination utility to handle page fetching.
 * Only fetches specified message type (default: 'text').
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - Chat room ID
 * @param limit - Maximum messages to fetch
 * @param logger - Logger for pagination progress
 * @param messageType - Message type filter (default: 'text')
 * @returns Array of chat messages (up to limit)
 */
export async function fetchChatMessagesWithLimit(
	httpClient: HttpClient,
	chatId: string,
	limit: number,
	logger: Logger,
	messageType: ChatMessageType = 'text',
): Promise<ChatMessage[]> {
	return fetchPaginated({
		fetchPage: (page, perPage) =>
			fetchChatMessages(httpClient, chatId, {
				page,
				page_size: perPage,
				message_type: messageType,
			}),
		perPage: 50,
		limit,
		logger,
		resourceName: 'messages',
	});
}

/**
 * Marks a message as being processed by a participant
 *
 * Creates a new processing attempt with a system-managed timestamp.
 * The participant must be a member of the chat room.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param messageId - ID of the message to mark as processing
 * @returns API response data
 */
export async function markMessageAsProcessing(
	httpClient: HttpClient,
	chatId: string,
	messageId: string,
): Promise<unknown> {
	return await httpClient.post(`/agent/chats/${chatId}/messages/${messageId}/processing`);
}

/**
 * Marks a message as successfully processed by a participant
 *
 * Completes the current processing attempt with a system-managed timestamp.
 * This endpoint requires an active processing attempt. If no processing attempt exists, it will return a 422 error.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param messageId - ID of the message to mark as processed
 * @returns API response data
 */
export async function markMessageAsProcessed(
	httpClient: HttpClient,
	chatId: string,
	messageId: string,
): Promise<unknown> {
	return await httpClient.post(`/agent/chats/${chatId}/messages/${messageId}/processed`);
}

/**
 * Marks message processing as failed
 *
 * Completes the current processing attempt by setting it to failed status with an error message.
 * This endpoint requires an active processing attempt. If no processing attempt exists, it will return a 422 error.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param messageId - ID of the message to mark as failed
 * @param errorMessage - Error message describing why processing failed
 * @returns API response data
 */
export async function markMessageAsFailed(
	httpClient: HttpClient,
	chatId: string,
	messageId: string,
	errorMessage: string,
): Promise<unknown> {
	const body = { error: errorMessage };
	return await httpClient.post(`/agent/chats/${chatId}/messages/${messageId}/failed`, body);
}
