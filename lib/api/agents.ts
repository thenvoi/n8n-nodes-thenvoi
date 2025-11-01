import { HttpClient } from '../http/client';
import { AddParticipantPayload, AgentBasicInfo, ParticipantRole } from '../types';

/**
 * Fetches all available agents from Thenvoi
 */
export async function fetchAvailableAgents(httpClient: HttpClient): Promise<AgentBasicInfo[]> {
	const response = await httpClient.get<{ data: AgentBasicInfo[] }>('/agents');
	return response.data || [];
}

/**
 * Adds an agent to a chat room with the specified role
 */
export async function addAgentToChat(
	httpClient: HttpClient,
	chatId: string,
	agentId: string,
): Promise<void> {
	const payload: AddParticipantPayload = {
		participant_id: agentId,
		role: 'member',
	};

	await httpClient.post(`/chats/${chatId}/participants`, payload);
}
