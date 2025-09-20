import { ITriggerFunctions, ITriggerResponse, NodeOperationError } from 'n8n-workflow';
import { nodeDescription } from './config/nodeConfig';
import { eventHandlerRegistry } from './handlers/EventHandlerRegistry';
import { BaseTriggerConfig, ThenvoiCredentials } from './types/types';
import { setupChannelEvents } from './utils/eventUtils';
import { createSocket, disconnectSocket } from './utils/socketUtils';

export class ThenvoiTrigger {
	description = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		try {
			const config = getTriggerConfig(this);
			const credentials = (await this.getCredentials('thenvoiApi')) as ThenvoiCredentials;

			validateCredentials(credentials, this);
			validateConfig(config, this);

			const serverUrl = credentials.serverUrl;

			const socket = createSocket(
				{
					serverUrl,
					apiKey: credentials.apiKey,
				},
				this.logger,
			);

			const channel = await setupChannelEvents(socket, config, this);

			return {
				closeFunction: async () => {
					disconnectSocket(socket, channel, this.logger);
				},
			};
		} catch (error) {
			this.logger.error('Thenvoi Trigger: Failed to initialize', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new NodeOperationError(
				this.getNode(),
				`Failed to initialize Thenvoi trigger: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}
}

// Helper functions
/**
 * Gets the trigger configuration from node parameters
 */
function getTriggerConfig(triggerContext: ITriggerFunctions): BaseTriggerConfig {
	const eventType = triggerContext.getNodeParameter('event') as string;

	// Get base configuration
	const baseConfig: BaseTriggerConfig = {
		chatRoomId: triggerContext.getNodeParameter('chatRoomId') as string,
		event: eventType,
	};

	// Get event-specific parameters
	const eventSpecificParams = eventHandlerRegistry.getEventSpecificParameters(eventType);
	const eventConfig: any = { ...baseConfig };

	// Add event-specific parameters to config
	eventSpecificParams.forEach((param) => {
		if (param.name && typeof param.name === 'string') {
			eventConfig[param.name] = triggerContext.getNodeParameter(param.name);
		}
	});

	return eventConfig;
}

/**
 * Validates the provided credentials
 */
function validateCredentials(
	credentials: ThenvoiCredentials,
	triggerContext: ITriggerFunctions,
): void {
	if (!credentials?.apiKey) {
		triggerContext.logger.error('Thenvoi Trigger: Missing API key');
		throw new NodeOperationError(triggerContext.getNode(), 'Thenvoi API key is required');
	}
	if (!credentials?.serverUrl) {
		triggerContext.logger.error('Thenvoi Trigger: Missing server URL');
		throw new NodeOperationError(triggerContext.getNode(), 'Thenvoi server URL is required');
	}
}

/**
 * Validates the trigger configuration using the appropriate event handler
 */
function validateConfig(config: BaseTriggerConfig, triggerContext: ITriggerFunctions): void {
	try {
		eventHandlerRegistry.validateConfig(config.event, config, triggerContext);
	} catch (error) {
		triggerContext.logger.error('Thenvoi Trigger: Configuration validation failed', {
			error: error instanceof Error ? error.message : String(error),
		});
		throw new NodeOperationError(
			triggerContext.getNode(),
			error instanceof Error ? error.message : 'Configuration validation failed',
		);
	}
}
