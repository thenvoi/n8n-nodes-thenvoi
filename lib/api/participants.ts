import { HttpClient } from '@lib/http/client';
import { ParticipantType, ChatParticipant, ParticipantRole, ParticipantStatus } from '@lib/types';
import { includeProperty } from '@lib/utils';

/**
 * Raw participant structure as returned by the API
 */
interface RawParticipant {
	id: string;
	type: ParticipantType;
	status?: string;
	email?: string | null;
	role?: string;
	first_name?: string | null;
	last_name?: string | null;
	agent_name?: string | null;
	avatar_url?: string | null;
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
		role: raw.role as ParticipantRole | undefined,
		status: raw.status as ParticipantStatus | undefined,
	};
}

/**
 * Fetches participants that are currently in a specific chat room
 */
export async function fetchChatParticipants(
	httpClient: HttpClient,
	chatId: string,
	participantType?: ParticipantType,
): Promise<ChatParticipant[]> {
	const body: Record<string, string> = {
		...includeProperty('participant_type', participantType),
	};

	const response = await httpClient.get<{ data: RawParticipant[] }>(
		`/chats/${chatId}/participants`,
		body,
	);

	const rawParticipants = response.data || [];
	return rawParticipants.map(transformParticipant);
}
