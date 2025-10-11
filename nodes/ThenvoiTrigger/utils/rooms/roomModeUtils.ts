import { Logger } from 'n8n-workflow';
import { HttpClient } from '../../services/http/HttpClient';
import { fetchAllRooms } from '../../services/room/roomApiUtils';
import {
	RoomInfo,
	RoomMode,
	RoomModeType,
	TriggerConfig,
	SingleRoomConfig,
	FilteredRoomsConfig,
} from '../../types';

/**
 * Room mode utilities for different subscription strategies
 */

/**
 * Room modes that support auto-subscription
 */
export const AUTO_SUBSCRIBE_SUPPORTED_MODES = [RoomMode.ALL, RoomMode.FILTERED] as RoomModeType[];

/**
 * Fetches rooms with optional filtering
 */
export async function fetchRooms(
	httpClient: HttpClient,
	logger: Logger,
	filterPattern?: string,
): Promise<RoomInfo[]> {
	const allRooms = await fetchAllRooms(httpClient, logger);
	return filterPattern ? filterRoomsByPattern(allRooms, filterPattern) : allRooms;
}

/**
 * Filters rooms by pattern matching
 */
export function filterRoomsByPattern(rooms: RoomInfo[], filterPattern: string): RoomInfo[] {
	if (!filterPattern) return rooms;

	// Simple pattern matching - can be enhanced later
	return rooms.filter((room) => room.title.toLowerCase().includes(filterPattern.toLowerCase()));
}

/**
 * Check if a room mode supports auto-subscription
 */
export function supportsAutoSubscribe(roomMode: string): boolean {
	return AUTO_SUBSCRIBE_SUPPORTED_MODES.includes(roomMode as any);
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
			const rooms = await fetchRooms(httpClient, logger, filteredConfig.roomFilter);
			return rooms.map((room) => room.id);
		},
	};

	const handler = handlers[config.roomMode];
	return handler ? handler() : [];
}
