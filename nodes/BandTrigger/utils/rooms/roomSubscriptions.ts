import { Logger } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import {
	RoomAddedEvent,
	RoomDeletedEvent,
	RoomInfo,
	RoomRemovedEvent,
	RoomSubscription,
} from '@lib/types';
import { TriggerConfig } from '../../types';
import { createAndJoinChannel, createAndJoinChatRoomChannel } from '@lib/socket';

// Types

/**
 * Callback for handling room deletion events
 */
export type OnRoomDeletedCallback = (roomId: string) => Promise<void>;

// Private Utilities

/**
 * Handle room_added event from agent_rooms channel
 */
async function handleRoomAdded(
	room: RoomAddedEvent,
	onRoomAdded: (room: RoomInfo) => Promise<void>,
	logger: Logger,
): Promise<void> {
	try {
		logger.info('New room detected');
		await onRoomAdded({
			...room,
			updated_at: new Date().toISOString(),
		});
	} catch {
		logger.error('Failed to auto-subscribe to room');
	}
}

/**
 * Handle room_removed event from agent_rooms channel
 */
async function handleRoomRemoved(
	event: RoomRemovedEvent,
	onRoomRemoved: (roomId: string) => Promise<void>,
	logger: Logger,
): Promise<void> {
	try {
		logger.info('Room removed event received');
		await onRoomRemoved(event.id);
	} catch {
		logger.error('Failed to handle room_removed for room');
	}
}

/**
 * Handle room_deleted event from room_participants channel
 */
async function handleRoomDeleted(
	event: RoomDeletedEvent,
	onRoomDeleted: OnRoomDeletedCallback,
	logger: Logger,
): Promise<void> {
	try {
		logger.info('Room deleted event received');
		await onRoomDeleted(event.id);
	} catch {
		logger.error('Failed to handle room_deleted for room');
	}
}

/**
 * Leave a single room's channels
 */
function leaveRoom(
	roomId: string,
	subscriptions: Map<string, RoomSubscription>,
	logger: Logger,
): void {
	const subscription = subscriptions.get(roomId);
	if (subscription) {
		try {
			leaveSubscriptionChannels(subscription);
			logger.info('Left room');
		} catch {
			logger.error('Failed to leave room');
		}
	}
}

// Public API

/**
 * Subscribe to a single room's events
 */
export async function subscribeToRoom(
	socket: Socket,
	roomId: string,
	config: TriggerConfig,
	subscriptions: Map<string, RoomSubscription>,
	onRoomEvent: (roomId: string, rawData: unknown) => void,
	logger: Logger,
): Promise<void> {
	if (subscriptions.has(roomId)) {
		logger.debug('Already subscribed to room');
		return;
	}

	logger.debug('Starting subscription to room');

	try {
		const channel = await createAndJoinChatRoomChannel(socket, {
			roomId,
			events: { [config.event]: (rawData: unknown) => onRoomEvent(roomId, rawData) },
			logger,
		});

		subscriptions.set(roomId, {
			roomId,
			channel,
			subscribed: true,
			lastActivity: new Date(),
		});

		logger.info('Successfully subscribed to room');
	} catch (error) {
		logger.error('Failed to subscribe to room');

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
	onRoomEvent: (roomId: string, rawData: unknown) => void,
	logger: Logger,
): Promise<void> {
	const promises = roomIds.map((roomId) =>
		subscribeToRoom(socket, roomId, config, subscriptions, onRoomEvent, logger),
	);

	await Promise.all(promises);

	logger.info(`Subscribed to ${roomIds.length} rooms`);
}

/**
 * Subscribe to room_participants channel for room_deleted events
 *
 * Used by auto-subscribe to detect when a room is deleted.
 */
export async function subscribeToRoomParticipants(
	socket: Socket,
	roomId: string,
	onRoomDeleted: OnRoomDeletedCallback,
	logger: Logger,
): Promise<Channel> {
	return createAndJoinChannel(socket, {
		channelName: `room_participants:${roomId}`,
		events: {
			room_deleted: (data: unknown) => {
				handleRoomDeleted(data as RoomDeletedEvent, onRoomDeleted, logger);
			},
		},
		logger,
	});
}

/**
 * Setup auto-subscribe for new rooms and auto-unsubscribe for removed rooms
 *
 * Listens for room_added and room_removed events on the agent_rooms channel.
 */
export async function setupAutoSubscribe(
	socket: Socket,
	agentId: string,
	logger: Logger,
	onRoomAdded: (room: RoomInfo) => Promise<void>,
	onRoomRemoved: (roomId: string) => Promise<void>,
): Promise<Channel> {
	return createAndJoinChannel(socket, {
		channelName: `agent_rooms:${agentId}`,
		events: {
			room_added: (data: unknown) => {
				handleRoomAdded(data as RoomAddedEvent, onRoomAdded, logger);
			},
			room_removed: (data: unknown) => {
				handleRoomRemoved(data as RoomRemovedEvent, onRoomRemoved, logger);
			},
		},
		logger,
	});
}

/**
 * Leaves all channels associated with a room subscription
 */
export function leaveSubscriptionChannels(subscription: RoomSubscription): void {
	subscription.channel.leave();
	subscription.participantsChannel?.leave();
}

/**
 * Clean up all subscriptions
 */
export function cleanupSubscriptions(
	subscriptions: Map<string, RoomSubscription>,
	logger: Logger,
): void {
	for (const roomId of subscriptions.keys()) {
		leaveRoom(roomId, subscriptions, logger);
	}
	subscriptions.clear();
}
