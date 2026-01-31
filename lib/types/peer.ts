/**
 * Peer Type Definitions
 *
 * Types for peers endpoint - returns both agents and users
 * that the authenticated agent can interact with
 */

/**
 * Peer information from /agent/peers endpoint
 *
 * Represents either an Agent or User that the authenticated agent
 * can interact with (add to chats, etc.)
 */
export interface Peer {
	id: string;
	name: string;
	description: string | null;
	type: 'User' | 'Agent';
	is_external: boolean | null; // For agents only
	is_global: boolean | null; // For agents only
}

/**
 * Pagination metadata for peers response
 */
export interface PeersPaginationMetadata {
	page: number;
	page_size: number;
	total_pages: number;
	total_count: number;
}

/**
 * Response structure for /agent/peers endpoint
 */
export interface PeersResponse {
	data: Peer[];
	metadata: PeersPaginationMetadata;
}

