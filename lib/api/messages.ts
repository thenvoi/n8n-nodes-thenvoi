import { IExecuteFunctions, IHttpRequestOptions, IDataObject } from 'n8n-workflow';
import {
	ChatMessageType,
	ChatMessageMention,
	ThenvoiCredentials,
	ThenvoiMessagePayload,
	ChatMessage,
	RawChatMessage,
} from '../types';
import { getHttpUrl, includeProperty } from '../utils';
import { HttpClient } from '../http/client';

/**
 * Sends a message to the Thenvoi API
 */
export async function sendMessageToThenvoi(
	executionContext: IExecuteFunctions,
	credentials: ThenvoiCredentials,
	chatId: string,
	messageType: ChatMessageType,
	content: string,
	mentions?: ChatMessageMention[],
): Promise<IDataObject> {
	const url = buildMessageUrl(credentials, chatId);
	const body = buildMessagePayload(messageType, content, credentials.userId, mentions);

	const requestOptions: IHttpRequestOptions = {
		method: 'POST',
		url,
		headers: {
			'X-API-Key': credentials.apiKey,
			'Content-Type': 'application/json',
		},
		body,
		json: true,
	};

	return (await executionContext.helpers.httpRequest(requestOptions)) as IDataObject;
}

/**
 * Builds the API URL for sending a message
 */
function buildMessageUrl(credentials: ThenvoiCredentials, chatId: string): string {
	const baseUrl = getHttpUrl(credentials, credentials.useHttps);
	return `${baseUrl}/chats/${chatId}/messages`;
}

/**
 * Builds the message payload for the API request
 */
function buildMessagePayload(
	messageType: ChatMessageType,
	content: string,
	senderId: string,
	mentions?: ChatMessageMention[],
): ThenvoiMessagePayload {
	return {
		content,
		message_type: messageType,
		sender_id: senderId,
		sender_type: 'User',
		...includeProperty('mentions', mentions),
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
		`/me/chats/${chatId}/messages`,
		queryParams,
	);

	// Parse date strings to Date objects for EventData type
	return (response.data || []).map((message) => ({
		...message,
		inserted_at: new Date(message.inserted_at),
		updated_at: new Date(message.updated_at),
	})) as ChatMessage[];
}
