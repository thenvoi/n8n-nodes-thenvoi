import { HttpClient } from '../http/client';
import { ChatMessage, RawChatMessage } from '../types';
import { includeProperty } from '../utils';

/**
 * Pagination metadata structure from context API response
 * Note: This endpoint uses "meta" not "metadata"
 */
interface ContextPaginationMeta {
	page: number;
	page_size: number;
	total_pages: number;
	total_count: number;
}

/**
 * Raw response structure from /agent/chats/{id}/context endpoint
 * Before date parsing
 */
interface RawContextResponse {
	data: RawChatMessage[];
	meta: ContextPaginationMeta;
}

/**
 * Response structure for /agent/chats/{id}/context endpoint
 * After date parsing
 */
export interface ContextResponse {
	data: ChatMessage[];
	meta: ContextPaginationMeta;
}

/**
 * Fetches agent context for a specific chat room
 *
 * Returns messages that the agent sent OR was mentioned in.
 * Used for agent rehydration when messageHistorySource === 'api'.
 * Different from /messages which returns all messages (filtered by status).
 *
 * @param httpClient - HTTP client for API requests
 * @param chatId - ID of the chat room
 * @param options - Optional query parameters:
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 50, max: 100)
 * @returns Paginated context response with agent's messages/events
 */
export async function fetchAgentContext(
	httpClient: HttpClient,
	chatId: string,
	options?: {
		page?: number;
		pageSize?: number;
	},
): Promise<ContextResponse> {
	const queryParams: Record<string, string> = {
		...includeProperty('page', options?.page?.toString()),
		...includeProperty('page_size', options?.pageSize?.toString()),
	};

	const response = await httpClient.get<RawContextResponse>(`/agent/chats/${chatId}/context`, queryParams);

	// Parse date strings to Date objects for ChatMessage type
	const parsedData = (response.data || []).map((message) => ({
		...message,
		inserted_at: new Date(message.inserted_at),
		updated_at: new Date(message.updated_at),
	})) as ChatMessage[];

	return {
		data: parsedData,
		meta: response.meta,
	};
}

