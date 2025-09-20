import { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { eventHandlerRegistry } from '../handlers/EventHandlerRegistry';
import { MessageCreatedHandler } from '../handlers/messageCreated/handler';

// Register event handlers
eventHandlerRegistry.register(new MessageCreatedHandler());

export const nodeDescription: INodeTypeDescription = {
	displayName: 'Thenvoi Trigger',
	name: 'thenvoiTrigger',
	icon: 'file:assets/thenvoi.svg',
	group: ['trigger'],
	version: 1,
	subtitle: '={{$parameter["event"]}}',
	description: 'Listen to Thenvoi channel events with configurable filtering',
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
	properties: eventHandlerRegistry.getAllNodeParameters(),
};
