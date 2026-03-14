import { EventData, RawBaseEventData } from './events';
import { ParticipantType } from './participant';

// Type definitions for message handling

/**
 * Mention format for outgoing API requests (/messages endpoint).
 */
export interface ChatMessageMention {
	id: string;
	handle?: string;
	name?: string;
}

/**
 * Mention format for incoming data (socket events and API fetch responses).
 */
export interface IncomingMention {
	id: string;
}

/**
 * Metadata for chat messages (socket events and API fetch).
 */
export interface ChatMessageMetadata {
	status: string;
	mentions: IncomingMention[];
}

/**
 * Event types that go to the /events endpoint (no mention validation)
 *
 * Only these 5 event types are supported by the API:
 * - tool_call: Tool invocation by the agent
 * - tool_result: Result from tool execution
 * - thought: Agent's internal reasoning/thoughts
 * - error: Error messages
 * - task: Task-related events
 */
export const CHAT_EVENT_TYPES = ['tool_call', 'tool_result', 'thought', 'error', 'task'] as const;

export type ChatEventType = (typeof CHAT_EVENT_TYPES)[number];

/**
 * All message types (text + events)
 */
export const CHAT_MESSAGE_TYPES = ['text', ...CHAT_EVENT_TYPES] as const;

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

/**
 * Type guard to check if a message type is an event type
 *
 * @param type - The message type to check
 * @returns True if the type is an event type, false otherwise
 */
export function isEventType(type: ChatMessageType): type is ChatEventType {
	return CHAT_EVENT_TYPES.includes(type as ChatEventType);
}

/**
 * Base message payload with shared properties
 */
export interface ThenvoiMessagePayload {
	content: string;
}

/**
 * Text message payload sent to /messages endpoint
 * Requires mentions array with id; handle and name are optional
 */
export interface ThenvoiTextPayload extends ThenvoiMessagePayload {
	mentions: ChatMessageMention[];
}

/**
 * Event payload sent to /events endpoint
 * No mention validation required
 */
export interface ThenvoiEventPayload extends ThenvoiMessagePayload {
	message_type: ChatEventType;
	metadata?: Record<string, unknown>;
}

/**
 * Request body wrapper for Thenvoi API /messages endpoint
 * The API requires the message payload to be wrapped in a "message" object
 */
export interface ThenvoiTextRequest {
	message: ThenvoiTextPayload;
}

/**
 * Request body wrapper for Thenvoi API /events endpoint
 * The API requires the event payload to be wrapped in an "event" object
 */
export interface ThenvoiEventRequest {
	event: ThenvoiEventPayload;
}

// Raw data structure as it comes from the socket
export interface RawChatMessage extends RawBaseEventData {
	chat_room_id: string;
	content: string;
	message_type: ChatMessageType;
	metadata: ChatMessageMetadata;
	sender_id: string;
	sender_type: ParticipantType;
	sender_name: string;
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
