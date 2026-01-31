import { HttpClient } from '../http/client';
import { PeersResponse } from '../types';
import { includeProperty } from '../utils';

/**
 * Fetches available peers (agents and users) for the authenticated agent
 *
 * Peers are entities that the agent can interact with - both other agents
 * and users in the agent's network. This replaces the deprecated
 * available-participants endpoint.
 *
 * @param httpClient - HTTP client for API requests
 * @param options - Optional query parameters:
 *   - notInChat: Exclude peers already in this chat
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 20, max: 100)
 * @returns Paginated peers response
 */
export async function fetchPeers(
	httpClient: HttpClient,
	options?: {
		notInChat?: string;
		page?: number;
		pageSize?: number;
	},
): Promise<PeersResponse> {
	const queryParams: Record<string, string> = {
		...includeProperty('not_in_chat', options?.notInChat),
		...includeProperty('page', options?.page?.toString()),
		...includeProperty('page_size', options?.pageSize?.toString()),
	};

	return httpClient.get<PeersResponse>('/agent/peers', queryParams);
}
