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
	avatar_url: string | null;
	email?: string;
	role?: ParticipantRole;
	status?: ParticipantStatus;
	description?: string; // For agents: description of what they do
}

export interface AvailableParticipant {
	id: string;
	name: string;
	type: ParticipantType;
	description: string | null;
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
