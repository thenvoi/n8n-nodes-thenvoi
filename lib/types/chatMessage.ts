import { EventData, RawBaseEventData } from './events';
import { ParticipantType } from './participant';

// Type definitions for message handling

export interface ChatMessageMention {
	id: string;
	username: string;
}

export interface ChatMessageMetadata {
	status: string;
	mentions: ChatMessageMention[];
}

export const CHAT_MESSAGE_TYPES: readonly string[] = [
	'text',
	'system',
	'action',
	'thought',
	'guidelines',
	'error',
	'tool_call',
	'tool_result',
	'task',
];

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

/**
 * Message payload sent to Thenvoi API
 */
export interface ThenvoiMessagePayload {
	content: string;
	message_type: string;
	sender_id: string;
	sender_type: ParticipantType;
	mentions?: ChatMessageMention[];
}

// Raw data structure as it comes from the socket
export interface RawChatMessage extends RawBaseEventData {
	chat_room_id: string;
	content: string;
	message_type: ChatMessageType;
	metadata: ChatMessageMetadata;
	sender_id: string;
	sender_type: ParticipantType;
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
		type: ParticipantType;
	};
	chat_room_id: string;
}
