import { INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { MessageCreatedHandler } from '../handlers/events/messageCreated/handler';
import { roomModeParameters } from './baseParameters';
import { generateConditionalUIParameters } from './parameterConfig';

// Register event handlers
eventHandlerRegistry.register(new MessageCreatedHandler());

export const nodeDescription: INodeTypeDescription = {
	displayName: 'Band Trigger',
	name: 'bandTrigger',
	icon: 'file:../../../dist/nodes/BandTrigger/assets/band.svg',
	group: ['trigger'],
	version: 1,
	subtitle: '={{$parameter["event"]}} - {{$parameter["roomMode"]}}',
	description: 'Listen to Band channel events with configurable filtering',
	defaults: {
		name: 'Band Trigger',
	},
	inputs: [],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'bandApi',
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
