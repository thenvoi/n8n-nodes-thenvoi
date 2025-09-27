import { RoomModeType } from './room';

/**
 * Base configuration interface - specific event configs should extend this
 */
export interface BaseTriggerConfig {
	roomMode: RoomModeType;
	chatRoomId?: string;
	roomFilter?: string;
	autoSubscribe?: boolean;
	event: string;
}

/**
 * Configuration specific to message created events
 */
export interface MessageCreatedConfig extends BaseTriggerConfig {
	event: 'message_created';
	mentionedUser: string;
	caseSensitive: boolean;
}
