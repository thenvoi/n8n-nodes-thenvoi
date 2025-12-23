import { HttpClient } from '../http/client';
import {
	AddParticipantRequest,
	ChatParticipant,
	ParticipantRole,
	ParticipantStatus,
	ParticipantType,
	Peer,
} from '../types';
import { includeProperty } from '../utils';
import { fetchPeers } from './peers';

/**
 * Raw participant structure as returned by the API
 */
interface RawParticipant {
	id: string;
	type: ParticipantType;
	status: ParticipantStatus;
	role: ParticipantRole;
	email?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	agent_name?: string | null;
	avatar_url?: string | null;
	description?: string | null; // For agents: description of what they do
}

/**
 * Transforms raw API participant data to ChatParticipant format
 *
 * Maps API fields to expected structure:
 * - Agents: uses `agent_name` as `name`
 * - Users: combines `first_name` and `last_name`, falls back to `email`
 *
 * Handles null/undefined values by providing sensible defaults
 * (empty strings, null for optional fields, undefined for omitted fields).
 *
 * @param raw - Raw participant data from API response
 * @returns Transformed ChatParticipant object with normalized fields
 */
function transformParticipant(raw: RawParticipant): ChatParticipant {
	let name: string;

	if (raw.type === 'Agent') {
		// For agents, use agent_name field
		name = raw.agent_name || '';
	} else {
		// For users, combine first_name and last_name, or use email as fallback
		const firstName = raw.first_name || '';
		const lastName = raw.last_name || '';

		if (firstName || lastName) {
			name = [firstName, lastName].filter(Boolean).join(' ');
		} else {
			name = raw.email || '';
		}
	}

	return {
		id: raw.id,
		name,
		type: raw.type,
		avatar_url: raw.avatar_url || null,
		email: raw.email || undefined,
		role: raw.role,
		status: raw.status,
		description: raw.description || undefined,
	};
}

/**
 * Fetches participants that are currently in a specific chat room
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param participantType - Optional filter by participant type (Agent or User)
 * @returns Array of chat participants
 */
export async function fetchChatParticipants(
	httpClient: HttpClient,
	chatId: string,
	participantType?: ParticipantType,
): Promise<ChatParticipant[]> {
	const queryParams: Record<string, string> = {
		...includeProperty('participant_type', participantType),
	};

	const response = await httpClient.get<{ data: RawParticipant[] }>(
		`/agent/chats/${chatId}/participants`,
		queryParams,
	);

	const rawParticipants = response.data || [];
	return rawParticipants.map(transformParticipant);
}

/**
 * Fetches available participants that can be added to a specific chat room
 *
 * Uses the /agent/peers endpoint with not_in_chat filter to exclude
 * participants already in the chat. Filters by participant type.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param participantType - Filter by participant type (Agent or User)
 * @returns Array of peers that can be added to the chat
 */
export async function fetchAvailableParticipants(
	httpClient: HttpClient,
	chatId: string,
	participantType: ParticipantType,
): Promise<Peer[]> {
	const peersResponse = await fetchPeers(httpClient, {
		notInChat: chatId,
		pageSize: 100,
	});

	return peersResponse.data.filter((peer) => peer.type === participantType);
}

/**
 * Fetches all available participants (both agents and users) that can be added to a chat room
 *
 * Uses the /agent/peers endpoint with not_in_chat filter to get all peers
 * (agents and users) that are not already in the chat.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @returns Array of all peers that can be added to the chat
 */
export async function fetchAllAvailableParticipants(
	httpClient: HttpClient,
	chatId: string,
): Promise<Peer[]> {
	const peersResponse = await fetchPeers(httpClient, {
		notInChat: chatId,
		pageSize: 100,
	});

	return peersResponse.data;
}

/**
 * Adds a participant (agent or user) to a chat room with 'member' role
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param participantId - ID of the participant to add
 */
export async function addParticipantToChat(
	httpClient: HttpClient,
	chatId: string,
	participantId: string,
): Promise<void> {
	const payload: AddParticipantRequest = {
		participant: {
			participant_id: participantId,
			role: 'member',
		},
	};

	await httpClient.post(`/agent/chats/${chatId}/participants`, payload);
}

/**
 * Removes a participant from a chat room
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param participantId - ID of the participant to remove
 */
export async function removeParticipantFromChat(
	httpClient: HttpClient,
	chatId: string,
	participantId: string,
): Promise<void> {
	await httpClient.delete(`/agent/chats/${chatId}/participants/${participantId}`);
}
