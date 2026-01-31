import { HttpClient } from '../http/client';
import { AddParticipantRequest, ChatParticipant, ParticipantType, Peer } from '../types';
import { fetchPeers } from './peers';

/**
 * Fetches participants that are currently in a specific chat room
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @returns Array of chat participants
 */
export async function fetchChatParticipants(
	httpClient: HttpClient,
	chatId: string,
): Promise<ChatParticipant[]> {
	const response = await httpClient.get<{ data: ChatParticipant[] }>(
		`/agent/chats/${chatId}/participants`,
	);

	return response.data || [];
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
