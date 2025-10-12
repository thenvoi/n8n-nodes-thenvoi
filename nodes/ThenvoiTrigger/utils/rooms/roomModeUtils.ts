import { Logger } from 'n8n-workflow';
import { HttpClient } from '../../services/http/HttpClient';
import { fetchAllRooms } from '../../services/room/roomApiUtils';
import {
	FilteredRoomsConfig,
	RoomInfo,
	RoomMode,
	RoomModeType,
	SingleRoomConfig,
	TriggerConfig,
} from '../../types';
import { filterRooms } from './roomFilterUtils';

/**
 * Room mode utilities for different subscription strategies
 */

// ===== CONSTANTS =====

/**
 * Room modes that support auto-subscription
 */
export const AUTO_SUBSCRIBE_SUPPORTED_MODES = [RoomMode.ALL, RoomMode.FILTERED] as RoomModeType[];

// ===== PUBLIC API =====

/**
 * Fetches rooms with optional filtering
 */
export async function fetchRooms(
	httpClient: HttpClient,
	logger: Logger,
	filterPattern?: string,
	roomTypes?: string[],
): Promise<RoomInfo[]> {
	const rooms = await fetchAllRooms(httpClient, logger);

	return filterRooms(rooms, filterPattern, roomTypes);
}

/**
 * Check if a room mode supports auto-subscription
 */
export function supportsAutoSubscribe(
	config: TriggerConfig,
): config is TriggerConfig & { autoSubscribe?: boolean } {
	return AUTO_SUBSCRIBE_SUPPORTED_MODES.includes(config.roomMode);
}

/**
 * Get room IDs to subscribe to based on room mode configuration
 */
export async function getRoomIdsForMode(
	config: TriggerConfig,
	httpClient: HttpClient,
	logger: Logger,
): Promise<string[]> {
	const handlers = {
		[RoomMode.SINGLE]: async () => {
			const singleConfig = config as SingleRoomConfig;
			return [singleConfig.chatRoomId];
		},
		[RoomMode.ALL]: async () => {
			const rooms = await fetchRooms(httpClient, logger);
			return rooms.map((room) => room.id);
		},
		[RoomMode.FILTERED]: async () => {
			const filteredConfig = config as FilteredRoomsConfig;
			const rooms = await fetchRooms(
				httpClient,
				logger,
				filteredConfig.roomFilter,
				filteredConfig.roomTypes,
			);
			return rooms.map((room) => room.id);
		},
	};

	const handler = handlers[config.roomMode];
	return handler ? handler() : [];
}
