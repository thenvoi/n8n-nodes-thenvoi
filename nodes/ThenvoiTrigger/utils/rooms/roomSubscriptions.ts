import { Logger } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import { RoomAddedEvent, RoomInfo, RoomRemovedEvent, RoomSubscription } from '@lib/types';
import { TriggerConfig } from '../../types';
import { createAndJoinChatRoomChannel } from '@lib/socket';
import { logError } from '@lib/utils';

/**
 * Subscribe to a single room
 */
export async function subscribeToRoom(
	socket: Socket,
	roomId: string,
	config: TriggerConfig,
	subscriptions: Map<string, RoomSubscription>,
	onEvent: (roomId: string, rawData: unknown) => void,
	logger: Logger,
): Promise<void> {
	if (subscriptions.has(roomId)) {
		logger.debug(`Already subscribed to room: ${roomId}`);
		return;
	}

	logger.debug(`Starting subscription to room: ${roomId}`);

	try {
		const channel = await createAndJoinChatRoomChannel(socket, {
			roomId,
			event: config.event,
			onEvent: (rawData: unknown) => onEvent(roomId, rawData),
			logger,
			timeout: 15000,
		});

		subscriptions.set(roomId, {
			roomId,
			channel,
			subscribed: true,
			lastActivity: new Date(),
		});

		logger.info(`Successfully subscribed to room: ${roomId}`);
	} catch (error) {
		logError(logger, `Failed to subscribe to room: ${roomId}`, error);

		throw error;
	}
}

/**
 * Subscribe to multiple rooms in parallel
 */
export async function subscribeToRooms(
	socket: Socket,
	roomIds: string[],
	config: TriggerConfig,
	subscriptions: Map<string, RoomSubscription>,
	onEvent: (roomId: string, rawData: unknown) => void,
	logger: Logger,
): Promise<void> {
	const promises = roomIds.map((roomId) =>
		subscribeToRoom(socket, roomId, config, subscriptions, onEvent, logger),
	);

	await Promise.all(promises);

	logger.info(`Subscribed to ${roomIds.length} rooms`);
}

/**
 * Handle room_added event
 */
async function handleRoomAdded(
	room: RoomAddedEvent,
	onRoomAdded: (room: RoomInfo) => Promise<void>,
	logger: Logger,
): Promise<void> {
	try {
		logger.info(`New room detected: ${room.id}`);
		await onRoomAdded({
			...room,
			updated_at: new Date().toISOString(),
		});
	} catch (error) {
		logError(
			logger,
			`Failed to auto-subscribe to room: ${room.id} ${error instanceof Error ? error.stack : error}`,
			error,
		);
	}
}

/**
 * Handle room_removed event
 */
async function handleRoomRemoved(
	event: RoomRemovedEvent,
	onRoomRemoved: (roomId: string) => Promise<void>,
	logger: Logger,
): Promise<void> {
	try {
		logger.info(`Room removed event received: ${event.id}`);
		await onRoomRemoved(event.id);
	} catch (error) {
		logError(logger, `Failed to handle room_removed for room: ${event.id}`, error);
	}
}

/**
 * Setup auto-subscribe for new rooms and auto-unsubscribe for removed rooms
 *
 * Listens for room_added and room_removed events on the agent_rooms channel.
 */
export function setupAutoSubscribe(
	socket: Socket,
	agentId: string,
	logger: Logger,
	onRoomAdded: (room: RoomInfo) => Promise<void>,
	onRoomRemoved: (roomId: string) => Promise<void>,
): Channel {
	const agentRoomsChannel = socket.channel(`agent_rooms:${agentId}`, {});

	agentRoomsChannel.on('room_added', (data: RoomAddedEvent) => {
		handleRoomAdded(data, onRoomAdded, logger);
	});

	agentRoomsChannel.on('room_removed', (data: RoomRemovedEvent) => {
		handleRoomRemoved(data, onRoomRemoved, logger);
	});

	agentRoomsChannel
		.join()
		.receive('ok', () => {
			logger.info('Agent rooms channel joined successfully');
		})
		.receive('error', (resp) => {
			logError(logger, 'Failed to join agent rooms channel', resp);
		});

	return agentRoomsChannel;
}

/**
 * Leave a single room
 */
async function leaveRoom(
	roomId: string,
	subscriptions: Map<string, RoomSubscription>,
	logger: Logger,
): Promise<void> {
	const subscription = subscriptions.get(roomId);
	if (subscription) {
		try {
			subscription.channel.leave();
			logger.info(`Left room: ${roomId}`);
		} catch (error) {
			logger.error(`Failed to leave room ${roomId}`, { error });
		}
	}
}

/**
 * Clean up all subscriptions
 */
export async function cleanupSubscriptions(
	subscriptions: Map<string, RoomSubscription>,
	logger: Logger,
): Promise<void> {
	const cleanupPromises = Array.from(subscriptions.keys()).map((roomId) =>
		leaveRoom(roomId, subscriptions, logger),
	);
	await Promise.all(cleanupPromises);
	subscriptions.clear();
}
