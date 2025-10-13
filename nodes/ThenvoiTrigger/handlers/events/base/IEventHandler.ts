import { ITriggerFunctions, INodeProperties } from 'n8n-workflow';
import { EventHandlerConfig } from '../../../types';

/**
 * Base interface for all event handlers
 */
export interface IEventHandler<TConfig = any, TData = any> {
	/**
	 * The event type this handler manages
	 */
	readonly eventType: string;

	/**
	 * Display name for the event type
	 */
	readonly displayName: string;

	/**
	 * Description of what this event handler does
	 */
	readonly description: string;

	/**
	 * Initialize the handler with configuration
	 * @param config Configuration object containing user ID and other settings
	 */
	initialize(config: EventHandlerConfig): void;

	/**
	 * Validates the configuration for this event handler
	 * @param config The configuration to validate
	 * @param context The trigger context for logging
	 */
	validateConfig(config: TConfig, context: ITriggerFunctions): void;

	/**
	 * Processes an incoming event
	 * @param rawData The raw data from the socket
	 * @param config The event-specific configuration
	 * @param context The trigger context
	 */
	processEvent(rawData: unknown, config: TConfig, context: ITriggerFunctions): void;

	/**
	 * Returns event-specific node parameters
	 */
	getEventSpecificParameters(): INodeProperties[];

	/**
	 * Determines if this event should trigger the workflow
	 * @param data The parsed event data
	 * @param config The event-specific configuration
	 * @param context The trigger context
	 */
	shouldTriggerWorkflow(data: TData, config: TConfig, context: ITriggerFunctions): boolean;

	/**
	 * Builds the enriched data payload to send to the workflow
	 * @param data The parsed event data
	 * @param config The event-specific configuration
	 * @param context The trigger context
	 */
	buildWorkflowPayload(data: TData, config: TConfig, context: ITriggerFunctions): any;
}
