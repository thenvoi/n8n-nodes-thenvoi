import { EventData, RawBaseEventData } from './events';

// Type definitions for message handling
export type SenderType = 'User' | 'Agent';

export interface ChatMessageMention {
	id: string;
	username: string;
}

export interface ChatMessageMetadata {
	status: string;
	mentions: ChatMessageMention[];
}

export type ChatMessageType =
	| 'text'
	| 'system'
	| 'action'
	| 'thought'
	| 'guidelines'
	| 'error'
	| 'tool_call'
	| 'tool_result'
	| 'task';

/**
 * Message payload sent to Thenvoi API
 */
export interface ThenvoiMessagePayload {
	content: string;
	message_type: string;
	sender_id: string;
}

// Raw data structure as it comes from the socket
export interface RawChatMessage extends RawBaseEventData {
	chat_room_id: string;
	content: string;
	message_type: ChatMessageType;
	metadata: ChatMessageMetadata;
	sender_id: string;
	sender_type: SenderType;
	thread_id: string | null;
}

// Parsed data structure with proper types - extends RawMessageData and only overrides date fields
export type ChatMessage = EventData<RawChatMessage>;

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
