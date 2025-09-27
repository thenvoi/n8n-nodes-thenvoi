import { RoomInfo } from '../../types';
import { Logger } from 'n8n-workflow';
import { HttpClient } from '../http/HttpClient';

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

	const response = await httpClient.get<{ data: RoomInfo[] }>('/api/v2/me/chats', params);
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
