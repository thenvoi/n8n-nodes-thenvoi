import { Logger } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import { raceWithTimeout } from '../timeoutUtils';

// Constants
const CHANNEL_JOIN_TIMEOUT = 10000;

// Types
export interface ChannelConfig {
	roomId: string;
	event: string;
	onEvent: (rawData: unknown) => void;
	logger: Logger;
	timeout?: number;
}

// Utility Functions

/**
 * Handles successful channel join
 */
function handleJoinSuccess(channel: Channel, logger: Logger, resp?: any): void {
	logger.info('ChannelManager: Joined channel', { resp });
}

/**
 * Handles channel join error
 */
function handleJoinError(channelName: string, logger: Logger, resp?: any): never {
	logger.error('ChannelManager: Failed to join channel', {
		channelName,
		error: resp,
	});

	throw new Error(`Unable to join Thenvoi channel: ${JSON.stringify(resp)}`);
}

/**
 * Handles channel join timeout
 */
function handleJoinTimeout(channelName: string, logger: Logger): never {
	logger.warn('ChannelManager: Channel join timeout', { channelName });

	throw new Error('Channel join timeout');
}

/**
 * Creates a join promise for a Phoenix channel
 */
function createJoinPromise(
	channel: Channel,
	channelName: string,
	logger: Logger,
): Promise<Channel> {
	return new Promise((resolve, reject) => {
		channel
			.join()
			.receive('ok', (resp?: any) => {
				handleJoinSuccess(channel, logger, resp);
				resolve(channel);
			})
			.receive('error', (resp?: any) => {
				reject(handleJoinError(channelName, logger, resp));
			})
			.receive('timeout', () => {
				reject(handleJoinTimeout(channelName, logger));
			});
	});
}

/**
 * Joins a Phoenix channel with timeout handling using Promise.race()
 */
async function joinChannelWithTimeout(
	channel: Channel,
	channelName: string,
	logger: Logger,
	timeoutMs?: number,
): Promise<Channel> {
	const timeoutTime = timeoutMs ?? CHANNEL_JOIN_TIMEOUT;
	const joinPromise = createJoinPromise(channel, channelName, logger);

	return raceWithTimeout(joinPromise, timeoutTime, new Error('Channel join timeout'));
}

// Public API
/**
 * Creates and joins a Phoenix channel with the specified configuration
 */
export async function createAndJoinChannel(
	socket: Socket,
	config: ChannelConfig,
): Promise<Channel> {
	const channelName = `chat_room:${config.roomId}`;
	const channel = socket.channel(channelName, {});

	// Set up event listener
	channel.on(config.event, config.onEvent);

	return joinChannelWithTimeout(channel, channelName, config.logger, config.timeout);
}
