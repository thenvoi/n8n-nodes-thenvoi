import { Logger } from 'n8n-workflow';
import { Socket } from 'phoenix';
import { RoomSubscription, TriggerConfig } from '../../types';
import { createAndJoinChannel } from '../socket';
import { logError } from '../errorUtils';

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
		const channel = await createAndJoinChannel(socket, {
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
 * Setup auto-subscribe for new rooms
 */
export function setupAutoSubscribe(
	socket: Socket,
	userId: string,
	logger: Logger,
	onRoomAdded: (roomId: string) => void,
): void {
	const userChannel = socket.channel(`user_rooms:${userId}`, {});

	userChannel.on('room_added', (data: { room_id: string }) => {
		logger.info(`New room detected: ${data.room_id}`);
		onRoomAdded(data.room_id);
	});

	userChannel.join();
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
