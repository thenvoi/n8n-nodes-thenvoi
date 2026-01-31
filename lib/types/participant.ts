/**
 * Participant Type Definitions
 *
 * Types for chat participants and participant management
 */

export type ParticipantRole = 'owner' | 'admin' | 'member';
export type ParticipantStatus = 'active' | 'inactive' | 'blocked';
export type ParticipantType = 'User' | 'Agent';

/**
 * Chat participant information
 */
export interface ChatParticipant {
	id: string;
	name: string;
	type: ParticipantType;
	role?: ParticipantRole;
	status?: ParticipantStatus;
	description?: string; // For agents: description of what they do
}

/**
 * Payload for adding a participant to a chat
 */
export interface AddParticipantPayload {
	participant_id: string;
	role: ParticipantRole;
}

/**
 * Request body for adding a participant to a chat API endpoint
 */
export interface AddParticipantRequest {
	participant: AddParticipantPayload;
}

/**
 * Sender information for messages and events
 *
 * Represents the identity of who sent something (message, event, etc.).
 * Used across memory storage, formatting, and display contexts.
 */
export interface SenderInfo {
	sender_id: string;
	sender_name: string;
	sender_type: ParticipantType;
}
