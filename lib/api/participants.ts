import { HttpClient } from '../http/client';
import {
	AddParticipantRequest,
	AvailableParticipant,
	ChatParticipant,
	ParticipantRole,
	ParticipantStatus,
	ParticipantType,
} from '../types';
import { includeProperty } from '../utils';

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
		`/chats/${chatId}/participants`,
		queryParams,
	);

	const rawParticipants = response.data || [];
	return rawParticipants.map(transformParticipant);
}

/**
 * Fetches available participants that can be added to a specific chat room
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param participantType - Filter by participant type (Agent or User)
 * @returns Array of available participants
 */
export async function fetchAvailableParticipants(
	httpClient: HttpClient,
	chatId: string,
	participantType: ParticipantType,
): Promise<AvailableParticipant[]> {
	const queryParams: Record<string, string> = {
		participant_type: participantType,
	};

	const response = await httpClient.get<{ data: AvailableParticipant[] }>(
		`/chats/${chatId}/available-participants`,
		queryParams,
	);

	return response.data || [];
}

/**
 * Fetches all available participants (both agents and users) that can be added to a chat room
 *
 * Fetches Agent and User participants in parallel and combines the results.
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @returns Array of all available participants (agents and users)
 */
export async function fetchAllAvailableParticipants(
	httpClient: HttpClient,
	chatId: string,
): Promise<AvailableParticipant[]> {
	const [agents, users] = await Promise.all([
		fetchAvailableParticipants(httpClient, chatId, 'Agent'),
		fetchAvailableParticipants(httpClient, chatId, 'User'),
	]);

	return [...agents, ...users];
}

/**
 * Adds a participant (agent or user) to a chat room with the specified role
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param participantId - ID of the participant to add
 * @param role - Role to assign to the participant (defaults to 'member')
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

	await httpClient.post(`/chats/${chatId}/participants`, payload);
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
	await httpClient.delete(`/chats/${chatId}/participants/${participantId}`);
}
