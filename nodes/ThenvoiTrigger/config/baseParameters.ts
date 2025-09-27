import { INodeProperties } from 'n8n-workflow';
import { RoomMode } from '../types';

/**
 * Base parameters that are common to all event handlers
 * Note: These parameters are loaded inside the EventHandlerRegistry.getAllNodeParameters()
 * and combined with room mode parameters in nodeConfig.ts
 */
export const baseParameters: INodeProperties[] = [
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		options: [], // Will be populated dynamically
		default: '',
		description: 'The event to listen for',
	},
];

/**
 * Room mode specific parameters
 */
export const roomModeParameters: INodeProperties[] = [
	{
		displayName: 'Room Mode',
		name: 'roomMode',
		type: 'options',
		options: [
			{
				name: 'Single Room',
				value: RoomMode.SINGLE,
				description: 'Listen to one specific chat room',
			},
			{
				name: 'All Rooms',
				value: RoomMode.ALL,
				description: 'Listen to all available chat rooms',
			},
			{
				name: 'Filtered Rooms',
				value: RoomMode.FILTERED,
				description: 'Listen to rooms matching a filter pattern',
			},
		],
		default: RoomMode.SINGLE,
		description: 'How to select which rooms to listen to',
	},
];
