import { INodeProperties } from 'n8n-workflow';
import { IEventHandler } from '../handlers/base/IEventHandler';

/**
 * Creates the event parameter with dynamically populated options
 */
export function createEventParameter(handlers: IEventHandler[]): INodeProperties {
	return {
		displayName: 'Event',
		name: 'event',
		type: 'options',
		options: handlers.map((handler) => ({
			name: handler.displayName,
			value: handler.eventType,
		})),
		default: '',
		description: 'The event to listen for',
	};
}