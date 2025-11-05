import { RoomMode } from '@lib/types';

/**
 * Base configuration properties shared across all room modes
 */
type BaseConfigProperties = {
	event: string;
};

/**
 * Single room mode configuration - requires chatRoomId
 */
export type SingleRoomConfig = BaseConfigProperties & {
	roomMode: typeof RoomMode.SINGLE;
	chatRoomId: string;
};

/**
 * All rooms mode configuration - includes autoSubscribe option
 */
export type AllRoomsConfig = BaseConfigProperties & {
	roomMode: typeof RoomMode.ALL;
	autoSubscribe?: boolean;
};

/**
 * Filtered rooms mode configuration - requires roomFilter, includes autoSubscribe option
 */
export type FilteredRoomsConfig = BaseConfigProperties & {
	roomMode: typeof RoomMode.FILTERED;
	roomFilter: string;
	autoSubscribe?: boolean;
};

/**
 * Discriminated union for room mode specific configurations
 * This ensures type safety - only relevant properties are available based on roomMode
 */
export type TriggerConfig = SingleRoomConfig | AllRoomsConfig | FilteredRoomsConfig;

/**
 * Configuration specific to message created events
 * Uses intersection types to combine room mode config with event-specific properties
 */
export type MessageCreatedConfig = TriggerConfig & {
	event: 'message_created';
};
