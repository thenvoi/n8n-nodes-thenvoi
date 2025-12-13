import { Logger } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import { raceWithTimeout } from '../utils/timeout';

// Constants
const CHANNEL_JOIN_TIMEOUT = 15000;

// Types

/**
 * Event handler function type for Phoenix channel events.
 *
 * Called when the associated event is received on the channel.
 *
 * @param rawData - The raw event payload from the Phoenix channel
 */
export type ChannelEventHandler = (rawData: unknown) => void;

export interface ChannelConfig {
	channelName: string;
	events: Record<string, ChannelEventHandler>;
	logger: Logger;
	timeout?: number;
}

export interface ChatRoomChannelConfig extends Omit<ChannelConfig, 'channelName'> {
	roomId: string;
}

// Utility Functions

/**
 * Handles successful channel join - called when Phoenix channel.join() receives 'ok'
 */
function handleJoinSuccess(channel: Channel, logger: Logger, resp?: unknown): void {
	logger.info('ChannelManager: Joined channel', { resp });
}

/**
 * Handles channel join error - called when Phoenix channel.join() receives 'error'
 */
function handleJoinError(channelName: string, logger: Logger, resp?: unknown): never {
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
			.receive('ok', (resp?: unknown) => {
				handleJoinSuccess(channel, logger, resp);
				resolve(channel);
			})
			.receive('error', (resp?: unknown) => {
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
 *
 * Supports multiple event handlers via the events Record.
 */
export async function createAndJoinChannel(
	socket: Socket,
	config: ChannelConfig,
): Promise<Channel> {
	const channel = socket.channel(config.channelName, {});

	for (const [event, handler] of Object.entries(config.events)) {
		channel.on(event, handler);
	}

	return joinChannelWithTimeout(channel, config.channelName, config.logger, config.timeout);
}

/**
 * Creates and joins a chat_room channel for message events
 *
 * Convenience wrapper for createAndJoinChannel with chat_room prefix.
 * Constructs the channel name as `chat_room:{roomId}`.
 *
 * @param socket - Phoenix socket instance to create the channel on
 * @param config - Channel configuration containing roomId, event handlers, and callbacks
 * @returns Promise resolving to the joined Phoenix Channel
 * @throws Error if channel join fails or times out
 *
 * @example
 * ```typescript
 * const channel = await createAndJoinChatRoomChannel(socket, {
 *   roomId: 'room-123',
 *   events: { 'new_message': (data) => console.log(data) },
 *   logger: context.logger,
 * });
 * ```
 */
export async function createAndJoinChatRoomChannel(
	socket: Socket,
	config: ChatRoomChannelConfig,
): Promise<Channel> {
	return createAndJoinChannel(socket, {
		channelName: `chat_room:${config.roomId}`,
		events: config.events,
		logger: config.logger,
		timeout: config.timeout,
	});
}
