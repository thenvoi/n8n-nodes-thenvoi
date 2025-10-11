import { Logger } from 'n8n-workflow';
import { HttpClient } from '../services/http/HttpClient';
import { fetchAllRooms } from '../services/room/roomApiUtils';
import { RoomInfo, RoomMode, RoomModeType } from '../types';

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
