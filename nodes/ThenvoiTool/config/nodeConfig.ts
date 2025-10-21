import { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

export const nodeDescription: INodeTypeDescription = {
	displayName: 'ThenvoiTool',
	name: 'thenvoiTool',
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
