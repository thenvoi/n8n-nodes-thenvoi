import { Channel } from 'phoenix';

/**
 * Room Mode constants for type safety
 */
export const RoomMode = {
	SINGLE: 'single',
	ALL: 'all',
	FILTERED: 'filtered',
} as const;

export type RoomModeType = (typeof RoomMode)[keyof typeof RoomMode];

/**
 * Room management types
 */

export const RoomType = ['direct', 'group', 'task'];

export type RoomType = (typeof RoomType)[number];

export interface RoomInfo {
	id: string;
	title: string;
	status: 'active' | 'archived' | 'closed';
	type: RoomType;
	inserted_at: string;
	updated_at: string;
}

export interface RoomSubscription {
	roomId: string;
	channel: Channel;
	subscribed: boolean;
	lastActivity: Date;
}

/**
 * API response types for rooms
 */
export interface RoomsApiResponse {
	data: RoomInfo[];
	meta?: {
		current_page: number;
		total_pages: number;
		total_count: number;
	};
}
