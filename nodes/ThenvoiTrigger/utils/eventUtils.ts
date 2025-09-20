import { ITriggerFunctions } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import { eventHandlerRegistry } from '../handlers/EventHandlerRegistry';
import { BaseTriggerConfig, ChannelJoinResponse, Logger } from '../types/types';

/**
 * Channel join timeout in milliseconds
 */
const CHANNEL_JOIN_TIMEOUT = 10000;

// Public functions
/**
 * Sets up channel events for a Phoenix socket
 */
export async function setupChannelEvents(
	socket: Socket,
	config: BaseTriggerConfig,
	triggerContext: ITriggerFunctions,
): Promise<Channel> {
	const channelName = `chat_room:${config.chatRoomId}`;

	const channel = socket.channel(channelName, {});

	// Set up the trigger function with proper context
	const triggerFunction = (rawData: unknown) => {
		handleEvent(rawData, config, triggerContext);
	};

	// Listen for the specified event
	channel.on(config.event, triggerFunction);

	// Join the channel and return a promise
	return joinChannel(channel, channelName, triggerContext.logger);
}

/**
 * Joins a Phoenix channel and handles the response
 */
async function joinChannel(
	channel: Channel,
	channelName: string,
	logger: Logger,
): Promise<Channel> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			logger.warn('EventHandler: Channel join timeout', { channelName });
			reject(new Error('Channel join timeout'));
		}, CHANNEL_JOIN_TIMEOUT);

		channel
			.join()
			.receive('ok', (resp: ChannelJoinResponse) => {
				clearTimeout(timeout);
				resolve(channel);
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
 * Handles incoming events using the appropriate event handler
 */
function handleEvent(
	rawData: unknown,
	config: BaseTriggerConfig,
	triggerContext: ITriggerFunctions,
): void {
	try {
		// Use the event registry to process the event
		eventHandlerRegistry.processEvent(config.event, rawData, config, triggerContext);
	} catch (error) {
		triggerContext.logger.error('EventHandler: Failed to process event', {
			eventType: config.event,
			error: error instanceof Error ? error.message : String(error),
			rawData,
		});
	}
}
