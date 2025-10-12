import { RoomInfo } from '../../types';

/**
 * Room filtering utilities for pattern and type-based filtering
 */

// ===== UTILITIES =====

/**
 * Checks if a room title matches the filter pattern
 */
function roomTitleMatchesPattern(room: RoomInfo, filterPattern: string): boolean {
	const regex = new RegExp(filterPattern, 'i');

	return regex.test(room.title);
}

/**
 * Checks if a room type matches the filter criteria
 */
function roomTypeMatchesFilter(room: RoomInfo, roomTypes: string[]): boolean {
	return roomTypes.includes(room.type);
}

// ===== PUBLIC API =====

/**
 * Checks if a single room matches the filter criteria
 * This is more efficient than filtering all rooms for a single room check
 */
export function roomMatchesFilters(
	room: RoomInfo,
	filterPattern?: string,
	roomTypes?: string[],
): boolean {
	// Check title filter
	if (filterPattern && !roomTitleMatchesPattern(room, filterPattern)) {
		return false;
	}

	// Check room type filter
	if (roomTypes && roomTypes.length > 0 && !roomTypeMatchesFilter(room, roomTypes)) {
		return false;
	}

	return true;
}

/**
 * Filters an array of rooms based on pattern and type criteria
 */
export function filterRooms(
	rooms: RoomInfo[],
	filterPattern?: string,
	roomTypes?: string[],
): RoomInfo[] {
	return rooms.filter((room) => roomMatchesFilters(room, filterPattern, roomTypes));
}
