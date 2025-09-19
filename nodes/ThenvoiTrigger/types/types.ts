import { IDataObject } from 'n8n-workflow';

// Constants
export const DEFAULT_SERVER_URL = 'wss://staging.thenvoi.com/api/v2/socket';
export const SUPPORTED_EVENTS = ['message_created'] as const;

// Type definitions
export type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];
export type SenderType = 'User' | 'Agent';

export interface ThenvoiCredentials {
	serverUrl: string;
	apiKey: string;
}

export interface TriggerConfig {
	chatRoomId: string;
	event: SupportedEvent;
	mentionedUser: string;
	caseSensitive: boolean;
	enableDebugLogging: boolean;
}

export interface MentionInfo {
	mentionedUser: string;
	caseSensitive: boolean;
	messageText: string;
}

export interface EnrichedMessageData extends IDataObject {
	_mention: MentionInfo;
}

export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	reconnectAfterMs?: (tries: number) => number;
}

export interface ChannelConfig {
	channelName: string;
	event: SupportedEvent;
}

export interface Logger {
	info: (message: string, meta?: Record<string, unknown>) => void;
	error: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
	debug: (message: string, meta?: Record<string, unknown>) => void;
}

export interface ChannelJoinResponse {
	ok?: unknown;
	error?: unknown;
}

export interface MessageMention {
	id: string;
	username: string;
}

export interface MessageMetadata {
	status: string;
	mentions: MessageMention[];
}

// Raw data structure as it comes from the socket (with string dates)
export interface RawMessageData {
	id: string;
	content: string;
	message_type: string;
	metadata: MessageMetadata;
	sender_id: string;
	sender_type: string;
	chat_room_id: string;
	thread_id: string | null;
	inserted_at: string; // ISO date string
	updated_at: string; // ISO date string
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
