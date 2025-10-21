import { IExecuteFunctions, IHttpRequestOptions, IDataObject } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { getHttpUrl } from '@lib/utils';
import { MessageConfig } from '../types';

/**
 * Builds the API URL for sending a message
 */
function buildMessageUrl(credentials: ThenvoiCredentials, chatId: string): string {
	const baseUrl = getHttpUrl(credentials, credentials.useHttps);
	return `${baseUrl}/chats/${chatId}/messages`;
}

/**
 * Prepares the request body for sending a message
 */
function buildRequestBody(config: MessageConfig, userId: string) {
	return {
		content: config.content,
		message_type: config.messageType,
		sender_id: userId,
	};
}

/**
 * Sends a message to the Thenvoi chat room
 * @param context - The execution context
 * @param config - The message configuration
 * @param credentials - The Thenvoi credentials
 * @returns The API response
 */
export async function sendMessage(
	context: IExecuteFunctions,
	config: MessageConfig,
	credentials: ThenvoiCredentials,
): Promise<IDataObject> {
	const url = buildMessageUrl(credentials, config.chatId);
	const body = buildRequestBody(config, credentials.userId);

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

	return (await context.helpers.httpRequest(requestOptions)) as IDataObject;
}
