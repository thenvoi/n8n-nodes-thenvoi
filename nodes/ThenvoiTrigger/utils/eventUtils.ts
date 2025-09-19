import { Socket } from 'phoenix';
import { IDataObject, ITriggerFunctions } from 'n8n-workflow';
import { TriggerConfig, Logger, ChannelJoinResponse, MessageData } from '../types/types';
import { extractMessageText, containsMention, createEnrichedMessageData } from './dataUtils';
import { parseMessageData } from './dataParser';

/**
 * Sets up channel events for a Phoenix socket
 */
export async function setupChannelEvents(
	socket: Socket,
	config: TriggerConfig,
	triggerContext: ITriggerFunctions,
): Promise<void> {
	const channelName = `chat_room:${config.chatRoomId}`;
	triggerContext.logger.info('EventHandler: Setting up channel events', { channelName });

	const channel = socket.channel(channelName, {});

	// Set up the trigger function with proper context
	const triggerFunction = (rawData: unknown) => {
		handleMessage(rawData, config, triggerContext);
	};

	// Listen for the specified event
	channel.on(config.event, triggerFunction);

	// Join the channel and return a promise
	return joinChannel(channel, channelName, triggerContext.logger);
}

/**
 * Joins a Phoenix channel and handles the response
 */
async function joinChannel(channel: any, channelName: string, logger: Logger): Promise<void> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			logger.warn('EventHandler: Channel join timeout', { channelName });
			reject(new Error('Channel join timeout'));
		}, 10000); // 10 second timeout

		channel
			.join()
			.receive('ok', (resp: ChannelJoinResponse) => {
				clearTimeout(timeout);
				logger.info('EventHandler: Successfully joined channel', {
					channelName,
					response: resp,
				});
				resolve();
			})
			.receive('error', (resp: ChannelJoinResponse) => {
				clearTimeout(timeout);
				logger.error('EventHandler: Failed to join channel', {
					channelName,
					error: resp,
				});
				reject(new Error(`Unable to join Thenvoi channel: ${JSON.stringify(resp)}`));
			})
			.receive('timeout', () => {
				clearTimeout(timeout);
				logger.warn('EventHandler: Channel join timeout', { channelName });
				reject(new Error('Channel join timeout'));
			});
	});
}

/**
 * Handles incoming messages and checks for mentions
 */
function handleMessage(
	rawData: unknown,
	config: TriggerConfig,
	triggerContext: ITriggerFunctions,
): void {
	try {
		// Parse the raw data into properly typed MessageData
		const data = parseMessageData(rawData, triggerContext.logger);

		logMessageReceived(data, config, triggerContext.logger);

		const messageText = extractMessageText(data, triggerContext.logger);

		if (shouldTriggerWorkflow(data, messageText, config, triggerContext.logger)) {
			triggerWorkflow(data, messageText, config, triggerContext);
		} else {
			logNoMentionFound(messageText, config, triggerContext.logger);
		}
	} catch (error) {
		triggerContext.logger.error('EventHandler: Failed to parse message data', {
			error: error instanceof Error ? error.message : String(error),
			rawData,
		});
	}
}

/**
 * Logs when a message is received
 */
function logMessageReceived(data: MessageData, config: TriggerConfig, logger: Logger): void {
	if (config.enableDebugLogging) {
		logger.debug('EventHandler: Received event', {
			event: config.event,
			data: JSON.stringify(data),
		});
	}
}

/**
 * Determines if the workflow should be triggered based on mention detection and message type
 */
function shouldTriggerWorkflow(
	data: MessageData,
	messageText: string,
	config: TriggerConfig,
	logger: Logger,
): boolean {
	if (config.enableDebugLogging) {
		logger.debug('EventHandler: Extracted message text', {
			messageText,
			mentionedUser: config.mentionedUser,
			messageType: data.message_type,
		});
	}

	// Check if message type is 'text'
	if (data.message_type !== 'text') {
		if (config.enableDebugLogging) {
			logger.debug('EventHandler: Message type is not text, skipping trigger', {
				messageType: data.message_type,
			});
		}
		return false;
	}

	return containsMention(data, config.mentionedUser, config.caseSensitive, logger);
}

/**
 * Triggers the workflow with enriched data
 */
function triggerWorkflow(
	data: MessageData,
	messageText: string,
	config: TriggerConfig,
	triggerContext: ITriggerFunctions,
): void {
	triggerContext.logger.info('EventHandler: Mention detected, triggering workflow', {
		mentionedUser: config.mentionedUser,
		messageText,
		caseSensitive: config.caseSensitive,
	});

	const enrichedData = createEnrichedMessageData(
		data,
		config.mentionedUser,
		config.caseSensitive,
		messageText,
	);

	triggerContext.logger.info(`INSERTED AT, ${data.inserted_at.toUTCString()}`);

	// Use the emit function from the trigger context
	triggerContext.emit([
		triggerContext.helpers.returnJsonArray([enrichedData as unknown as IDataObject]),
	]);
}

/**
 * Logs when no mention is found
 */
function logNoMentionFound(messageText: string, config: TriggerConfig, logger: Logger): void {
	if (config.enableDebugLogging) {
		logger.debug('EventHandler: No mention found, skipping trigger', {
			messageText,
			mentionedUser: config.mentionedUser,
		});
	}
}
