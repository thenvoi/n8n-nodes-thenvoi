import { RoomInfo } from '../types';
import { Logger } from 'n8n-workflow';
import { HttpClient } from '../http/client';
import { fetchPaginated } from '../utils/pagination';

/**
 * Pagination metadata structure from API responses
 */
interface PaginationMetadata {
	page: number;
	page_size: number;
	total_pages: number;
	total_count: number;
}

/**
 * Fetches a single page of rooms for the authenticated agent
 *
 * @param httpClient - HTTP client for API requests
 * @param page - Page number to fetch
 * @param pageSize - Number of rooms per page
 * @returns Array of room information
 */
export async function fetchRoomsPage(
	httpClient: HttpClient,
	page: number,
	pageSize: number,
): Promise<RoomInfo[]> {
	const params: Record<string, string> = {
		page: page.toString(),
		page_size: pageSize.toString(),
	};

	const response = await httpClient.get<{ data: RoomInfo[]; metadata: PaginationMetadata }>(
		'/agent/chats',
		params,
	);
	return response.data || [];
}

/**
 * Fetches all rooms by handling pagination automatically
 *
 * @param httpClient - HTTP client for API requests
 * @param logger - Logger for pagination progress
 * @returns Array of all room information
 */
export async function fetchAllRooms(
	httpClient: HttpClient,
	logger: Logger,
): Promise<RoomInfo[]> {
	return fetchPaginated({
		fetchPage: (page, perPage) => fetchRoomsPage(httpClient, page, perPage),
		perPage: 100,
		logger,
		resourceName: 'rooms',
	});
}

/**
 * Fetches information about a specific chat room
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @returns Chat room information
 */
export async function fetchChatRoom(httpClient: HttpClient, chatId: string): Promise<RoomInfo> {
	const response = await httpClient.get<{ data: RoomInfo }>(`/agent/chats/${chatId}`);
	return response.data;
}
