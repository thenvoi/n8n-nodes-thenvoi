import { IExecuteFunctions, IHttpRequestOptions, IDataObject } from 'n8n-workflow';
import {
	ChatMessageType,
	ChatMessageMention,
	ThenvoiCredentials,
	ThenvoiMessagePayload,
} from '../types';
import { getHttpUrl, includeProperty } from '../utils';

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
