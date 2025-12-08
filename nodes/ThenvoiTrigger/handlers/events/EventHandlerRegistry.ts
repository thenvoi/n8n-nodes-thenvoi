import { INodeProperties, ITriggerFunctions } from 'n8n-workflow';
import { IEventHandler } from './base/IEventHandler';
import { TriggerConfig } from '../../types';
import { baseParameters } from '../../config/baseParameters';
import { createEventParameter } from '../../utils/events/eventParameterUtils';

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
	validateConfig(eventType: string, config: TriggerConfig, context: ITriggerFunctions): void {
		const handler = this.getHandler(eventType);
		handler.validateConfig(config, context);
	}

	/**
	 * Processes an event using the appropriate handler
	 */
	processEvent(
		eventType: string,
		rawData: unknown,
		config: TriggerConfig,
		context: ITriggerFunctions,
	): void {
		const handler = this.getHandler(eventType);
		handler.processEvent(rawData, config, context);
	}

	/**
	 * Gets all node parameters for all events (for dynamic UI generation)
	 */
	getAllNodeParameters(): INodeProperties[] {
		// Create event parameter with dynamic options
		const eventParameter = createEventParameter(this.getAllHandlers());

		// Get base parameters without the event parameter (we'll add our dynamic one)
		const baseParamsWithoutEvent = baseParameters.filter((param) => param.name !== 'event');

		// Collect all event-specific parameters from all handlers
		const allEventSpecificParams: INodeProperties[] = [];
		this.getAllHandlers().forEach((handler) => {
			const eventSpecificParams = handler.getEventSpecificParameters();
			allEventSpecificParams.push(...eventSpecificParams);
		});

		// Combine base parameters with event parameter and event-specific parameters
		return [...baseParamsWithoutEvent, eventParameter, ...allEventSpecificParams];
	}
}

/**
 * Global registry instance
 */
export const eventHandlerRegistry = new EventHandlerRegistry();
