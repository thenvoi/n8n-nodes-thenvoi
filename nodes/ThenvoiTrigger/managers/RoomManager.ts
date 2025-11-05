import { ITriggerFunctions, Logger } from 'n8n-workflow';
import { Socket } from 'phoenix';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { HttpClient } from '@lib/http';
import { RoomInfo, RoomSubscription, ThenvoiCredentials } from '@lib/types';
import { FilteredRoomsConfig, RoomMode, TriggerConfig } from '../types';
import { logError } from '@lib/utils';
import { roomMatchesFilters } from '../utils/rooms/roomFilterUtils';
import { getRoomIdsForMode, supportsAutoSubscribe } from '../utils/rooms/roomModeUtils';
import {
	cleanupSubscriptions,
	setupAutoSubscribe,
	subscribeToRoom,
	subscribeToRooms,
} from '../utils/rooms/roomSubscriptions';

/**
 * Manages room subscriptions and event handling for all room modes
 */
export class RoomManager {
	private socket: Socket;
	private logger: Logger;
	private config: TriggerConfig;
	private triggerContext: ITriggerFunctions;
	private httpClient: HttpClient;
	private agentId: string;
	private subscriptions = new Map<string, RoomSubscription>();

	constructor(
		socket: Socket,
		config: TriggerConfig,
		triggerContext: ITriggerFunctions,
		credentials: ThenvoiCredentials,
	) {
		this.socket = socket;
		this.config = config;
		this.logger = triggerContext.logger;
		this.triggerContext = triggerContext;
		this.httpClient = new HttpClient(credentials, this.logger);
		this.agentId = credentials.agentId;

		this.subscribeToNewRoom = this.subscribeToNewRoom.bind(this);
		this.unsubscribeFromRoom = this.unsubscribeFromRoom.bind(this);
	}

	async initialize(): Promise<void> {
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

		this.initializeAutoSubscribe();
	}

	private initializeAutoSubscribe(): void {
		if (supportsAutoSubscribe(this.config) && this.config.autoSubscribe) {
			setupAutoSubscribe(
				this.socket,
				this.agentId,
				this.logger,
				this.subscribeToNewRoom,
				this.unsubscribeFromRoom,
			);
		}
	}

	private async subscribeToNewRoom(room: RoomInfo): Promise<void> {
		// For filtered mode, check if the new room matches the filter criteria
		if (this.config.roomMode === RoomMode.FILTERED) {
			const filteredConfig = this.config as FilteredRoomsConfig;
			const shouldSubscribe = this.shouldSubscribeToRoom(room, filteredConfig);
			if (!shouldSubscribe) {
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
	}

	private shouldSubscribeToRoom(room: RoomInfo, config: FilteredRoomsConfig): boolean {
		return roomMatchesFilters(room, config.roomFilter);
	}

	private async unsubscribeFromRoom(roomId: string): Promise<void> {
		const subscription = this.subscriptions.get(roomId);

		if (subscription) {
			try {
				subscription.channel.leave();
				this.subscriptions.delete(roomId);
				this.logger.info(`Unsubscribed from removed room: ${roomId}`);
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
				{ ...this.config, chatRoomId: roomId },
				this.triggerContext,
			);
		} catch (error) {
			logError(this.logger, 'Room event handling failed', error, {
				roomId,
				rawData,
			});
		}
	}

	async cleanup(): Promise<void> {
		await cleanupSubscriptions(this.subscriptions, this.logger);
	}

	getSubscribedRooms(): string[] {
		return Array.from(this.subscriptions.keys());
	}
}
