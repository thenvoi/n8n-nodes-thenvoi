import { ITriggerFunctions, NodeOperationError } from 'n8n-workflow';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { TriggerConfig } from '../types';
import { ThenvoiCredentials } from '@lib/types';
import { logError, getSafeErrorMessage } from '@lib/utils';

/**
 * Validates a regex pattern string
 * @param pattern - The regex pattern to validate
 * @returns true if valid, throws error if invalid
 */
export function validateRegexPattern(pattern: string): boolean {
	try {
		new RegExp(pattern, 'i');
		return true;
	} catch (error) {
		throw new Error(
			`Invalid regex pattern: ${pattern}. ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Validates the provided credentials
 * Basic required field validation is handled by n8n's credential system
 * This method can be extended for more sophisticated validation if needed
 */
export function validateCredentials(
	credentials: ThenvoiCredentials,
	triggerContext: ITriggerFunctions,
): void {
	if (!credentials) {
		triggerContext.logger.error('Thenvoi Trigger: No credentials provided');
		throw new NodeOperationError(triggerContext.getNode(), 'Thenvoi credentials are required');
	}
}

/**
 * Validates the trigger configuration using the appropriate event handler
 * Note: Basic parameter validation is handled by n8n based on node configuration
 * This function focuses on business logic validation
 */
export function validateConfig(config: TriggerConfig, triggerContext: ITriggerFunctions): void {
	try {
		eventHandlerRegistry.validateConfig(config.event, config, triggerContext);
	} catch (error) {
		logError(triggerContext.logger, 'Thenvoi Trigger: Configuration validation failed', error);

		throw new NodeOperationError(
			triggerContext.getNode(),
			getSafeErrorMessage(error) || 'Configuration validation failed',
		);
	}
}
