import { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { SUPPORTED_EVENTS } from '../types/types';

export const nodeDescription: INodeTypeDescription = {
	displayName: 'Thenvoi Trigger',
	name: 'thenvoiTrigger',
	icon: 'file:assets/thenvoi.svg',
	group: ['trigger'],
	version: 1,
	subtitle: '={{$parameter["event"]}}',
	description: 'Listen to Thenvoi channel events with mention filtering',
	defaults: {
		name: 'Thenvoi Trigger',
	},
	inputs: [],
	outputs: [NodeConnectionType.Main],
	credentials: [
		{
			name: 'thenvoiApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Chat Room ID',
			name: 'chatRoomId',
			type: 'string',
			default: '',
			required: true,
			description: 'The ID of the chat room to listen to',
		},
		{
			displayName: 'Event',
			name: 'event',
			type: 'options',
			options: SUPPORTED_EVENTS.map((event) => ({
				name: event.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
				value: event,
			})),
			default: 'message_created',
			description: 'The event to listen for',
		},
		{
			displayName: 'Mentioned User',
			name: 'mentionedUser',
			type: 'string',
			default: '',
			required: true,
			description: 'The username to filter for mentions (e.g., "john" for @john mentions)',
			displayOptions: {
				show: {
					event: ['message_created'],
				},
			},
		},
		{
			displayName: 'Case Sensitive',
			name: 'caseSensitive',
			type: 'boolean',
			default: false,
			description: 'Whether the mention matching should be case sensitive',
			displayOptions: {
				show: {
					event: ['message_created'],
				},
			},
		},
		{
			displayName: 'Enable Debug Logging',
			name: 'enableDebugLogging',
			type: 'boolean',
			default: false,
			description: 'Whether to enable detailed logging for debugging purposes',
		},
	],
};
