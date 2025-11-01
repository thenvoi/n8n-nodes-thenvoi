import { HttpClient } from '@lib/http/client';
import { ParticipantType, ChatParticipant } from '@lib/types';
import { includeProperty } from '@lib/utils';

/**
 * Fetches agents that are currently in a specific chat room
 */
export async function fetchChatParticipants(
	httpClient: HttpClient,
	chatId: string,
	participantType?: ParticipantType,
): Promise<ChatParticipant[]> {
	const body: Record<string, string> = {
		...includeProperty('participant_type', participantType),
	};

	const response = await httpClient.get<{ data: ChatParticipant[] }>(
		`/chats/${chatId}/participants`,
		body,
	);

	return response.data || [];
}
