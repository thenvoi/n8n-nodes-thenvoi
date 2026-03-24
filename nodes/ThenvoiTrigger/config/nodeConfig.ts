import { INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { MessageCreatedHandler } from '../handlers/events/messageCreated/handler';
import { roomModeParameters } from './baseParameters';
import { generateConditionalUIParameters } from './parameterConfig';

// Register event handlers
eventHandlerRegistry.register(new MessageCreatedHandler());

export const nodeDescription: INodeTypeDescription = {
	displayName: 'Thenvoi Trigger',
	name: 'thenvoiTrigger',
	icon: 'file:../../../dist/nodes/ThenvoiTrigger/assets/thenvoi.svg',
	group: ['trigger'],
	version: 1,
	subtitle: '={{$parameter["event"]}} - {{$parameter["roomMode"]}}',
	description: 'Listen to Thenvoi channel events with configurable filtering',
	defaults: {
		name: 'Thenvoi Trigger',
	},
	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'thenvoiApi',
			required: true,
		},
	],
	properties: [
		// Room mode specific parameters
		...roomModeParameters,
		// Generated conditional UI parameters from centralized configuration
		...generateConditionalUIParameters(),
		// All other parameters (Event, Event-specific) come from registry
		...eventHandlerRegistry.getAllNodeParameters(),
	],
};
