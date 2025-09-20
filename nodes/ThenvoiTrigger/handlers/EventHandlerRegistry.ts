import { INodeProperties } from 'n8n-workflow';
import { IEventHandler } from './base/IEventHandler';

/**
 * Registry for managing event handlers
 */
export class EventHandlerRegistry {
	private handlers: Map<string, IEventHandler> = new Map();

	/**
	 * Registers an event handler
	 */
	register(handler: IEventHandler): void {
		if (this.handlers.has(handler.eventType)) {
			throw new Error(`Event handler for '${handler.eventType}' is already registered`);
		}

		this.handlers.set(handler.eventType, handler);
	}

	/**
	 * Gets an event handler by event type
	 */
	getHandler(eventType: string): IEventHandler {
		const handler = this.handlers.get(eventType);
		if (!handler) {
			throw new Error(`No event handler found for event type: ${eventType}`);
		}
		return handler;
	}

	/**
	 * Gets all supported event types
	 */
	getSupportedEvents(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Gets all registered handlers
	 */
	private getAllHandlers(): IEventHandler[] {
		return Array.from(this.handlers.values());
	}

	/**
	 * Gets event-specific parameters for a given event type
	 */
	getEventSpecificParameters(eventType: string): INodeProperties[] {
		const handler = this.getHandler(eventType);
		return handler.getEventSpecificParameters();
	}

	/**
	 * Validates configuration for a specific event type
	 */
	validateConfig(eventType: string, config: any, context: any): void {
		const handler = this.getHandler(eventType);
		handler.validateConfig(config, context);
	}

	/**
	 * Processes an event using the appropriate handler
	 */
	processEvent(eventType: string, rawData: unknown, config: any, context: any): void {
		const handler = this.getHandler(eventType);
		handler.processEvent(rawData, config, context);
	}

	/**
	 * Gets all node parameters for all events (for dynamic UI generation)
	 */
	getAllNodeParameters(): INodeProperties[] {
		const baseParameters: INodeProperties[] = [
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
				options: this.getSupportedEvents().map((eventType) => {
					const handler = this.getHandler(eventType);
					return {
						name: handler.displayName,
						value: eventType,
					};
				}),
				default: '',
				description: 'The event to listen for',
			},
		];

		// Collect all event-specific parameters from all handlers
		const allEventSpecificParams: INodeProperties[] = [];
		this.getAllHandlers().forEach((handler) => {
			const eventSpecificParams = handler.getEventSpecificParameters();
			allEventSpecificParams.push(...eventSpecificParams);
		});

		// Combine base parameters with all event-specific parameters
		return [...baseParameters, ...allEventSpecificParams];
	}
}

/**
 * Global registry instance
 */
export const eventHandlerRegistry = new EventHandlerRegistry();
