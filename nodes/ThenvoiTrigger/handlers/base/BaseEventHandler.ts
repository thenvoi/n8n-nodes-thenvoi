import { IDataObject, INodeProperties, ITriggerFunctions } from 'n8n-workflow';
import { BaseEventData, BaseTriggerConfig, RawBaseEventData } from '../../types/types';
import { parseDateString } from '../../utils/dataParser';
import { IEventHandler } from './IEventHandler';

/**
 * Abstract base class for event handlers providing common functionality
 */
export abstract class BaseEventHandler<
	TConfig extends BaseTriggerConfig,
	TRawData extends RawBaseEventData,
	TData extends BaseEventData,
> implements IEventHandler<TConfig, TData>
{
	// Abstract properties - must be implemented by subclasses
	abstract readonly eventType: string;
	abstract readonly displayName: string;
	abstract readonly description: string;

	// Protected properties
	/**
	 * Optional list of accepted message types for this event handler
	 * If provided, the base class will validate message_type before calling shouldTriggerWorkflow
	 */
	protected acceptedMessageTypes?: string[];

	// Abstract methods - must be implemented by subclasses
	/**
	 * Abstract method that subclasses must implement to determine if workflow should trigger
	 */
	abstract shouldTriggerWorkflow(data: TData, config: TConfig, context: ITriggerFunctions): boolean;

	/**
	 * Abstract method that subclasses must implement to build workflow payload
	 */
	abstract buildWorkflowPayload(data: TData, config: TConfig, context: ITriggerFunctions): any;

	/**
	 * Abstract method that subclasses must implement to provide event-specific parameters
	 */
	abstract getEventSpecificParameters(): INodeProperties[];

	// Public interface methods
	/**
	 * Validates the configuration - calls base validation and custom validation
	 * Subclasses can override validateCustomConfig to add event-specific validation
	 */
	validateConfig(config: TConfig, context: ITriggerFunctions): void {
		// Always validate base configuration
		this.validateBaseConfig(config, context);

		// Call custom validation (default implementation does nothing)
		this.validateCustomConfig(config, context);
	}

	/**
	 * Default implementation of processEvent
	 * Subclasses can override for custom processing
	 */
	processEvent(rawData: TRawData, config: TConfig, context: ITriggerFunctions): void {
		try {
			const data = this.parseEventData(rawData, context);

			// Check message type if acceptedMessageTypes is defined
			if (this.acceptedMessageTypes && this.hasMessageTypeProperty(data)) {
				if (!this.acceptedMessageTypes.includes(data.message_type)) {
					return;
				}
			}

			if (this.shouldTriggerWorkflow(data, config, context)) {
				this.triggerWorkflow(data, config, context);
			}
		} catch (error) {
			context.logger.error('Event Handler: Failed to process event', {
				eventType: this.eventType,
				error: error instanceof Error ? error.message : String(error),
				rawData,
			});
		}
	}

	// Protected methods - can be overridden by subclasses
	/**
	 * Default implementation of parseEventData - parses base event data
	 * Subclasses can override for custom parsing that extends base parsing
	 */
	parseEventData(rawData: TRawData, context: ITriggerFunctions): TData {
		// Parse base event data (handles common fields like id, chat_room_id, dates)
		const insertedAt = parseDateString(rawData.inserted_at, 'inserted_at', context.logger);
		const updatedAt = parseDateString(rawData.updated_at, 'updated_at', context.logger);

		// Return the parsed base data with proper types
		return {
			id: rawData.id,
			chat_room_id: rawData.chat_room_id,
			inserted_at: insertedAt,
			updated_at: updatedAt,
		} as TData;
	}

	/**
	 * Override this method to add custom validation logic for specific properties
	 * Default implementation does nothing - n8n parameters handle basic validation
	 */
	protected validateCustomConfig(config: TConfig, context: ITriggerFunctions): void {
		// Default: no custom validation needed
		// Subclasses can override for custom business logic validation
	}

	// Private methods - internal implementation
	/**
	 * Validates the base configuration that all events share
	 */
	private validateBaseConfig(config: TConfig, context: ITriggerFunctions): void {
		// Add validation for base configuration in the future if needed
	}

	/**
	 * Triggers the workflow with enriched data
	 */
	private triggerWorkflow(data: TData, config: TConfig, context: ITriggerFunctions): void {
		const workflowData = this.buildWorkflowPayload(data, config, context);

		// Use the emit function from the trigger context
		context.emit([context.helpers.returnJsonArray([workflowData as unknown as IDataObject])]);
	}

	/**
	 * Helper method to check if data has message_type property
	 */
	private hasMessageTypeProperty(data: any): data is { message_type: string } {
		return data && typeof data === 'object' && 'message_type' in data;
	}
}
