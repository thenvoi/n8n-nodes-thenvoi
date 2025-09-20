import { BaseTriggerConfig, RawBaseEventData } from '../../types/types';

// Type definitions for message handling
export type SenderType = 'User' | 'Agent';

export interface MessageMention {
	id: string;
	username: string;
}

export interface MessageMetadata {
	status: string;
	mentions: MessageMention[];
}

// Raw data structure as it comes from the socket
export interface RawMessageData extends RawBaseEventData {
	content: string;
	message_type: string;
	metadata: MessageMetadata;
	sender_id: string;
	sender_type: string;
	thread_id: string | null;
}

// Parsed data structure with proper types - extends RawMessageData and only overrides date fields
export interface MessageData
	extends Omit<RawMessageData, 'inserted_at' | 'updated_at' | 'sender_type'> {
	sender_type: SenderType;
	inserted_at: Date;
	updated_at: Date;
}

export interface N8NMessageResponse {
	id: string;
	content: string;
	originalContent: string;
	sender: {
		id: string;
		type: SenderType;
	};
	chat_room_id: string;
}

/**
 * Configuration specific to message created events
 */
export interface MessageCreatedConfig extends BaseTriggerConfig {
	event: 'message_created';
	mentionedUser: string;
	caseSensitive: boolean;
}
