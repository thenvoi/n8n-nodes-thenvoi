import {
	ChatMessageType,
	ChatMessageMention,
	ThenvoiMessageRequest,
	ChatMessage,
	RawChatMessage,
} from '../types';
import { includeProperty } from '../utils';
import { HttpClient } from '../http/client';

/**
 * Sends a message to the Thenvoi API
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param messageType - Type of message to send
 * @param content - Message content
 * @param senderId - ID of the message sender
 * @param mentions - Optional array of mentions
 * @returns API response data
 */
export async function sendMessageToThenvoi(
	httpClient: HttpClient,
	chatId: string,
	messageType: ChatMessageType,
	content: string,
	senderId: string,
	mentions?: ChatMessageMention[],
): Promise<unknown> {
	const body = buildMessagePayload(messageType, content, senderId, mentions);

	return await httpClient.post(`/chats/${chatId}/messages`, body);
}

/**
 * Builds the message payload for the API request
 */
function buildMessagePayload(
	messageType: ChatMessageType,
	content: string,
	senderId: string,
	mentions?: ChatMessageMention[],
): ThenvoiMessageRequest {
	return {
		message: {
			content,
			message_type: messageType,
			sender_id: senderId,
			sender_type: 'Agent',
			mentions: mentions || [],
		},
	};
}

/**
 * Fetches chat messages from the Thenvoi API
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param params - Optional query parameters:
 *   - page: Page number (default: 1)
 *   - per_page: Number of messages per page (default: 20, max: 50)
 *   - since: ISO timestamp to get messages after a certain date
 *   - message_type: Filter by message type (text, system, action, thought, etc.)
 * @returns Array of chat messages
 */
export async function fetchChatMessages(
	httpClient: HttpClient,
	chatId: string,
	params?: {
		page?: number;
		per_page?: number;
		since?: string;
		message_type?: ChatMessageType;
	},
): Promise<ChatMessage[]> {
	const queryParams: Record<string, string> = {
		...includeProperty('page', params?.page?.toString()),
		...includeProperty('per_page', params?.per_page?.toString()),
		...includeProperty('since', params?.since),
		...includeProperty('message_type', params?.message_type),
	};

	const response = await httpClient.get<{ data: RawChatMessage[] }>(
		`/chats/${chatId}/messages`,
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
	return await httpClient.post(`/chats/${chatId}/messages/${messageId}/processing`);
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
	return await httpClient.post(`/chats/${chatId}/messages/${messageId}/processed`);
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
	return await httpClient.post(`/chats/${chatId}/messages/${messageId}/failed`, body);
}
