import { ITriggerFunctions, Logger } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { HttpClient } from '@lib/http';
import { RoomInfo, RoomSubscription, ThenvoiCredentials } from '@lib/types';
import { FilteredRoomsConfig, RoomMode, TriggerConfig } from '../types';
import { logError } from '@lib/utils';
import { roomMatchesFilters } from '../utils/rooms/roomFilterUtils';
import { getRoomIdsForMode, supportsAutoSubscribe } from '../utils/rooms/roomModeUtils';
import {
	cleanupSubscriptions,
	leaveSubscriptionChannels,
	setupAutoSubscribe,
	subscribeToRoom,
	subscribeToRoomParticipants,
	subscribeToRooms,
} from '../utils/rooms/roomSubscriptions';
import { createSocket } from '@lib/socket';

/**
 * Manages room subscriptions and event handling for all room modes
 */
export class RoomManager {
	private socket!: Socket;
	private logger: Logger;
	private config: TriggerConfig;
	private triggerContext: ITriggerFunctions;
	private httpClient: HttpClient;
	private agentId: string;
	private credentials: ThenvoiCredentials;
	private subscriptions = new Map<string, RoomSubscription>();
	private agentRoomsChannel?: Channel;
	private autoSubscribeActive = false;
	private isReconnecting = false;

	constructor(
		config: TriggerConfig,
		triggerContext: ITriggerFunctions,
		credentials: ThenvoiCredentials,
	) {
		this.config = config;
		this.logger = triggerContext.logger;
		this.triggerContext = triggerContext;
		this.httpClient = new HttpClient(credentials, this.logger);
		this.agentId = credentials.agentId;
		this.credentials = credentials;

		this.subscribeToNewRoom = this.subscribeToNewRoom.bind(this);
		this.unsubscribeFromRoom = this.unsubscribeFromRoom.bind(this);
		this.handleReconnection = this.handleReconnection.bind(this);
	}

	/**
	 * Creates and initializes the socket with reconnection callback
	 */
	async initializeSocket(): Promise<Socket> {
		this.socket = await createSocket(
			{
				serverUrl: this.credentials.serverUrl,
				apiKey: this.credentials.apiKey,
				agentId: this.credentials.agentId,
				onReconnect: () => this.handleReconnection(),
			},
			this.logger,
		);

		return this.socket;
	}

	async initialize(): Promise<void> {
		await this.subscribeToAllRooms();
		await this.addRoomDeletionListeners();
		await this.initializeAutoSubscribe();
	}

	/**
	 * Fetches rooms based on room mode and subscribes to them
	 */
	private async subscribeToAllRooms(): Promise<void> {
		// Get rooms to subscribe based on room mode
		const roomIds = await getRoomIdsForMode(
			this.config,
			this.httpClient,
			this.agentId,
			this.logger,
		);

		// Subscribe to all rooms
		await subscribeToRooms(
			this.socket,
			roomIds,
			this.config,
			this.subscriptions,
			(roomId: string, rawData: unknown) => this.handleRoomEvent(roomId, rawData),
			this.logger,
		);
	}

	/**
	 * Initializes auto-subscribe features:
	 * - Sets up agent_rooms channel for room_added/room_removed events
	 */
	private async initializeAutoSubscribe(): Promise<void> {
		if (!supportsAutoSubscribe(this.config) || !this.config.autoSubscribe) {
			return;
		}

		this.autoSubscribeActive = true;

		// Set up agent_rooms channel for room_added/room_removed
		this.agentRoomsChannel = await setupAutoSubscribe(
			this.socket,
			this.agentId,
			this.logger,
			this.subscribeToNewRoom,
			this.unsubscribeFromRoom,
		);
	}

	/**
	 * Adds room_participants channel listeners for all existing subscriptions
	 */
	private async addRoomDeletionListeners(): Promise<void> {
		const subscriptions = Array.from(this.subscriptions.values());
		const promises = subscriptions.map(async (subscription) => {
			subscription.participantsChannel = await subscribeToRoomParticipants(
				this.socket,
				subscription.roomId,
				this.unsubscribeFromRoom,
				this.logger,
			);
		});

		await Promise.all(promises);
	}

	/**
	 * Handles socket reconnection by orchestrating channel reconnection
	 */
	async handleReconnection(): Promise<void> {
		if (this.isReconnecting) {
			this.logger.debug('Reconnection already in progress, skipping...');
			return;
		}

		this.isReconnecting = true;
		this.logger.info('Socket reconnected, fetching current rooms and rejoining channels...');

		try {
			await this.reconnectChannels();
		} catch (error) {
			logError(this.logger, 'Failed to rejoin some channels after reconnection', error);
		} finally {
			this.isReconnecting = false;
		}
	}

	/**
	 * Reconnects all channels by clearing old subscriptions and re-subscribing to current rooms
	 */
	private async reconnectChannels(): Promise<void> {
		// Clear old channel references (they're invalid after disconnect)
		this.subscriptions.clear();

		// Fetch and subscribe to current rooms (may have changed during disconnect)
		await this.subscribeToAllRooms();
		this.logger.info(`Rejoined ${this.subscriptions.size} room channels after reconnection`);

		// Set up room deletion listeners for reconnected subscriptions
		await this.addRoomDeletionListeners();

		// Rejoin auto-subscribe channels if it was active
		if (this.autoSubscribeActive) {
			await this.initializeAutoSubscribe();
		}
	}

	/**
	 * Subscribes to a new room (called by auto-subscribe when room_added is received)
	 */
	private async subscribeToNewRoom(room: RoomInfo): Promise<void> {
		// For filtered mode, check if the new room matches the filter criteria
		if (this.config.roomMode === RoomMode.FILTERED) {
			const filteredConfig = this.config as FilteredRoomsConfig;

			if (!this.shouldSubscribeToRoom(room, filteredConfig)) {
				this.logger.debug(
					`Room ${room.id} does not match filter criteria, skipping auto-subscribe`,
				);
				return;
			}
		}

		await subscribeToRoom(
			this.socket,
			room.id,
			this.config,
			this.subscriptions,
			(roomId: string, rawData: unknown) => this.handleRoomEvent(roomId, rawData),
			this.logger,
		);

		// Add room_participants listener for this new room
		const subscription = this.subscriptions.get(room.id);
		if (subscription) {
			subscription.participantsChannel = await subscribeToRoomParticipants(
				this.socket,
				room.id,
				this.unsubscribeFromRoom,
				this.logger,
			);
		}
	}

	/**
	 * Checks if a room matches the filter criteria for subscription
	 */
	private shouldSubscribeToRoom(room: RoomInfo, config: FilteredRoomsConfig): boolean {
		return roomMatchesFilters(room, config.roomFilter);
	}

	private async unsubscribeFromRoom(roomId: string): Promise<void> {
		const subscription = this.subscriptions.get(roomId);

		if (subscription) {
			try {
				leaveSubscriptionChannels(subscription);
				this.subscriptions.delete(roomId);
				this.logger.info(`Unsubscribed from room: ${roomId}`);
			} catch (error) {
				logError(this.logger, `Failed to unsubscribe from room: ${roomId}`, error);
			}
		}
	}

	private handleRoomEvent(roomId: string, rawData: unknown): void {
		try {
			eventHandlerRegistry.processEvent(
				this.config.event,
				rawData,
				this.config,
				this.triggerContext,
			);
		} catch (error) {
			logError(this.logger, 'Room event handling failed', error, {
				roomId,
				rawData,
			});
		}
	}

	cleanup(): void {
		if (this.agentRoomsChannel) {
			this.agentRoomsChannel.leave();
			this.agentRoomsChannel = undefined;
		}
		cleanupSubscriptions(this.subscriptions, this.logger);
	}

	getSubscribedRooms(): string[] {
		return Array.from(this.subscriptions.keys());
	}
}
