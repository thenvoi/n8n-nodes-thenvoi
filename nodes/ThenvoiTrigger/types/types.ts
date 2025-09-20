export interface ThenvoiCredentials {
	serverUrl: string;
	apiKey: string;
}

// Base configuration interface - specific event configs should extend this
export interface BaseTriggerConfig {
	chatRoomId: string;
	event: string;
}

// Base event data interface that all event data should extend
export interface BaseEventData {
	id: string;
	chat_room_id: string;
	inserted_at: Date;
	updated_at: Date;
}

export interface RawBaseEventData {
	id: string;
	chat_room_id: string;
	inserted_at: string;
	updated_at: string;
}

export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	reconnectAfterMs?: (tries: number) => number;
}

export interface ChannelJoinResponse {
	ok?: unknown;
	error?: unknown;
}

export interface Logger {
	info: (message: string, meta?: Record<string, unknown>) => void;
	error: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
	debug: (message: string, meta?: Record<string, unknown>) => void;
}
