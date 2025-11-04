import { RoomInfo } from '../types';
import { Logger } from 'n8n-workflow';
import { HttpClient } from '../http/client';

/**
 * Fetches a single page of rooms for an agent
 *
 * @param httpClient - HTTP client for API requests
 * @param agentId - ID of the agent
 * @param page - Page number to fetch
 * @param pageSize - Number of rooms per page
 * @returns Array of room information
 */
export async function fetchRoomsPage(
	httpClient: HttpClient,
	agentId: string,
	page: number,
	pageSize: number,
): Promise<RoomInfo[]> {
	const params = {
		status: 'active',
		page: page.toString(),
		page_size: pageSize.toString(),
	};

	const response = await httpClient.get<{ data: RoomInfo[] }>(`/agents/${agentId}/chats`, params);
	return response.data || [];
}

/**
 * Fetches all rooms by handling pagination automatically
 *
 * @param httpClient - HTTP client for API requests
 * @param agentId - ID of the agent
 * @param logger - Logger for pagination progress
 * @returns Array of all room information
 */
export async function fetchAllRooms(
	httpClient: HttpClient,
	agentId: string,
	logger: Logger,
): Promise<RoomInfo[]> {
	const allRooms: RoomInfo[] = [];
	let page = 1;
	const pageSize = 100;

	while (true) {
		const rooms = await fetchRoomsPage(httpClient, agentId, page, pageSize);

		logger.info('Fetched rooms on page', { page, roomCount: rooms.length });

		allRooms.push(...rooms);

		if (isLastPage(rooms, pageSize)) {
			break;
		}

		page++;
	}

	logger.info(`Fetched ${allRooms.length} rooms across ${page} pages`);
	return allRooms;
}

/**
 * Determines if the current page is the last page
 */
function isLastPage(rooms: RoomInfo[], perPage: number): boolean {
	return rooms.length === 0 || rooms.length < perPage;
}

/**
 * Fetches information about a specific chat room
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @returns Chat room information
 */
export async function fetchChatRoom(httpClient: HttpClient, chatId: string): Promise<RoomInfo> {
	const response = await httpClient.get<{ data: RoomInfo }>(`/chats/${chatId}`);
	return response.data;
}
