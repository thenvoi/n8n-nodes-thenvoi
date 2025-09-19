import { ITriggerResponse, ITriggerFunctions, NodeOperationError } from 'n8n-workflow';

import { createSocket, disconnectSocket } from './utils/socketUtils';
import { setupChannelEvents } from './utils/eventUtils';
import { TriggerConfig, ThenvoiCredentials, SupportedEvent } from './types/types';
import { nodeDescription } from './config/nodeConfig';

export class ThenvoiTrigger {
	description = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		try {
			const config = getTriggerConfig(this);
			const credentials = (await this.getCredentials('thenvoiApi')) as ThenvoiCredentials;

			validateCredentials(credentials, this);
			validateConfig(config, this);

			const serverUrl = credentials.serverUrl;
			this.logger.info('Thenvoi Trigger: Starting trigger setup', {
				...config,
				serverUrl: serverUrl.replace(/\/socket$/, ''), // Log without sensitive path
			});

			const socket = createSocket(
				{
					serverUrl,
					apiKey: credentials.apiKey,
				},
				this.logger,
			);

			await setupChannelEvents(socket, config, this);
			this.logger.info('Thenvoi Trigger: Successfully initialized');

			return {
				closeFunction: async () => {
					this.logger.info('Thenvoi Trigger: Closing connection');
					disconnectSocket(socket, this.logger);
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

/**
 * Gets the trigger configuration from node parameters
 */
function getTriggerConfig(triggerContext: ITriggerFunctions): TriggerConfig {
	return {
		chatRoomId: triggerContext.getNodeParameter('chatRoomId') as string,
		event: triggerContext.getNodeParameter('event') as SupportedEvent,
		mentionedUser: triggerContext.getNodeParameter('mentionedUser') as string,
		caseSensitive: triggerContext.getNodeParameter('caseSensitive') as boolean,
		enableDebugLogging: triggerContext.getNodeParameter('enableDebugLogging') as boolean,
	};
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
 * Validates the trigger configuration
 */
function validateConfig(config: TriggerConfig, triggerContext: ITriggerFunctions): void {
	if (!config.chatRoomId) {
		triggerContext.logger.error('Thenvoi Trigger: Missing chat room ID');
		throw new NodeOperationError(triggerContext.getNode(), 'Chat Room ID is required');
	}

	if (config.event === 'message_created' && !config.mentionedUser) {
		triggerContext.logger.error('Thenvoi Trigger: Missing mentioned user');
		throw new NodeOperationError(
			triggerContext.getNode(),
			'Mentioned User is required for message_created events',
		);
	}
}
