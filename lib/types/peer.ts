/**
 * Peer Type Definitions
 *
 * Types for peers endpoint - returns both agents and users
 * that the authenticated agent can interact with
 */

/**
 * How the peer was discovered
 */
export type PeerSource = 'registry' | 'contact';

/**
 * Peer information from /agent/peers endpoint
 *
 * Represents either an Agent or User that the authenticated agent
 * can interact with (add to chats, etc.)
 */
export interface Peer {
	handle: string;
	id: string;
	name: string;
	description: string | null;
	type: 'User' | 'Agent';
	is_contact: boolean;
	is_external: boolean | null;
	source: PeerSource;
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
