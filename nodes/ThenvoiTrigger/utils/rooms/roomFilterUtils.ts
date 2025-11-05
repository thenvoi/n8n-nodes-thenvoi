import { RoomInfo } from '@lib/types';

/**
 * Room filtering utilities for pattern-based filtering
 */

// ===== UTILITIES =====

/**
 * Checks if a room title matches the filter pattern
 */
function roomTitleMatchesPattern(room: RoomInfo, filterPattern: string): boolean {
	const regex = new RegExp(filterPattern, 'i');

	return regex.test(room.title);
}

// ===== PUBLIC API =====

/**
 * Checks if a single room matches the filter criteria
 * This is more efficient than filtering all rooms for a single room check
 */
export function roomMatchesFilters(room: RoomInfo, filterPattern?: string): boolean {
	// Check title filter
	if (filterPattern && !roomTitleMatchesPattern(room, filterPattern)) {
		return false;
	}

	return true;
}

/**
 * Filters an array of rooms based on pattern criteria
 */
export function filterRooms(rooms: RoomInfo[], filterPattern?: string): RoomInfo[] {
	return rooms.filter((room) => roomMatchesFilters(room, filterPattern));
}
