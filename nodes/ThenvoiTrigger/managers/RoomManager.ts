import { ITriggerFunctions, Logger } from 'n8n-workflow';
import { Socket } from 'phoenix';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { HttpClient } from '../services/http/HttpClient';
import { FilteredRoomsConfig, RoomSubscription, ThenvoiCredentials, TriggerConfig } from '../types';
import { logError } from '../utils/errorUtils';
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
	private userId: string;
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
		this.userId = credentials.userId;
	}

	async initialize(): Promise<void> {
		// Get rooms to subscribe based on room mode
		const roomIds = await getRoomIdsForMode(this.config, this.httpClient, this.logger);

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
		if (supportsAutoSubscribe(this.config.roomMode)) {
			const config = this.config as FilteredRoomsConfig;
			if (config.autoSubscribe) {
				setupAutoSubscribe(
					this.socket,
					this.userId,
					this.logger,
					this.subscribeToNewRoom,
					this.unsubscribeFromRoom,
				);
			}
		}
	}

	private async subscribeToNewRoom(roomId: string): Promise<void> {
		await subscribeToRoom(
			this.socket,
			roomId,
			this.config,
			this.subscriptions,
			(roomId: string, rawData: unknown) => this.handleRoomEvent(roomId, rawData),
			this.logger,
		);
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
