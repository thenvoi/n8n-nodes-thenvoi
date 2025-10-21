import { ChatMessageType } from '@lib/types';
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

// const messageTypeToDescription: Partial<Record<ChatMessageType, string>> = {
// 	text: 'Final user-facing responses',
// 	thought: 'internal reasoning and thoughts',
// 	tool_call: 'When calling a tool',
// 	tool_result: 'When reporting tool results',
// 	error: 'When reporting errors or issues',
// };

export class Thenvoi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Thenvoi',
		name: 'thenvoi',
		icon: 'file:assets/thenvoi.svg',
		group: ['transform'],
		version: 1,
		description: 'Send AI responses to the thenvoi chat room',
		subtitle: '={{$parameter["chatId"]}}',
		usableAsTool: true,
		defaults: {
			name: 'thenvoi',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'thenvoiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
				description: 'The ID of the chat room to send the message to',
			},
			{
				displayName: 'Message Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				placeholder: 'Enter your message here...',
				description: 'The content of the message to send',
			},
			{
				displayName: 'Message Type',
				name: 'messageType',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'text, thought, tool_call, tool_result, error',
				description: 'The type of message to send (text, thought, tool_call, tool_result, error)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials
		const credentials = await this.getCredentials('thenvoiApi');

		if (!credentials) {
			throw new NodeOperationError(
				this.getNode(),
				'No credentials provided. Please configure Thenvoi API credentials.',
			);
		}

		const apiKey = credentials.apiKey as string;
		const serverUrl = credentials.serverUrl as string;
		const useHttps = credentials.useHttps as boolean;
		const userId = credentials.userId as string;

		// Validate credentials
		if (!apiKey || !serverUrl || !userId) {
			throw new NodeOperationError(
				this.getNode(),
				'Invalid credentials. Please ensure API Key, Server URL, and User ID are configured.',
			);
		}

		// Build the protocol
		const protocol = useHttps ? 'https' : 'http';

		// Process each input item
		for (let i = 0; i < items.length; i++) {
			try {
				// Get parameters for this item
				const chatId = this.getNodeParameter('chatId', i) as string;
				const content = this.getNodeParameter('content', i) as string;
				const messageType = this.getNodeParameter('messageType', i) as ChatMessageType;

				// Validate parameters
				if (!chatId) {
					throw new NodeOperationError(this.getNode(), 'Chat ID is required', {
						itemIndex: i,
					});
				}

				if (!content) {
					throw new NodeOperationError(this.getNode(), 'Message content is required', {
						itemIndex: i,
					});
				}

				// Build the API URL
				const url = `${protocol}://${serverUrl}/chats/${chatId}/messages`;

				// Prepare the request body
				const body = {
					content,
					message_type: messageType,
					sender_id: userId,
				};

				// Make the HTTP request
				const response = await this.helpers.httpRequest({
					method: 'POST',
					url,
					headers: {
						'X-API-Key': apiKey,
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				});

				// Add the response to return data
				returnData.push({
					json: response,
					pairedItem: { item: i },
				});
			} catch (error) {
				// Handle errors for this item
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message || 'Unknown error occurred',
						},
						pairedItem: { item: i },
					});
					continue;
				}

				throw new NodeOperationError(
					this.getNode(),
					`Failed to send message: ${error.message || 'Unknown error'}`,
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
