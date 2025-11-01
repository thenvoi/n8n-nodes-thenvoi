import { RoomInfo } from '../types';
import { Logger } from 'n8n-workflow';
import { HttpClient } from '../http/client';

/**
 * Fetches a single page of rooms
 */
export async function fetchRoomsPage(
	httpClient: HttpClient,
	page: number,
	perPage: number,
): Promise<RoomInfo[]> {
	const params = {
		status: 'active',
		type: 'direct',
		page: page.toString(),
		per_page: perPage.toString(),
	};

	const response = await httpClient.get<{ data: RoomInfo[] }>('/me/chats', params);
	return response.data || [];
}

/**
 * Fetches all rooms by handling pagination automatically
 */
export async function fetchAllRooms(httpClient: HttpClient, logger: Logger): Promise<RoomInfo[]> {
	const allRooms: RoomInfo[] = [];
	let page = 1;
	const perPage = 100;

	while (true) {
		const rooms = await fetchRoomsPage(httpClient, page, perPage);

		if (isLastPage(rooms, perPage)) {
			allRooms.push(...rooms);
			break;
		}

		allRooms.push(...rooms);
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
