import { HttpClient } from '../http/client';
import { Agent, AgentBasicInfo, AgentMe } from '../types';

/**
 * Fetches all available agents from Thenvoi
 *
 * @param httpClient - HTTP client for API requests
 * @returns Array of available agent basic information
 */
export async function fetchAvailableAgents(httpClient: HttpClient): Promise<AgentBasicInfo[]> {
	const response = await httpClient.get<{ data: AgentBasicInfo[] }>('/agents');
	return response.data || [];
}

/**
 * Fetches the agent profile for the authenticated agent
 *
 * Validates API key and returns agent identity information.
 * Used for credential testing and agent identity confirmation.
 *
 * @param httpClient - HTTP client for API requests
 * @returns Agent profile information
 */
export async function fetchAgentProfile(httpClient: HttpClient): Promise<AgentMe> {
	const response = await httpClient.get<{ data: AgentMe }>('/agent/me');
	return response.data;
}

/**
 * Fetches detailed information about a specific agent
 *
 * @param httpClient - HTTP client for API requests
 * @param agentId - ID of the agent to fetch
 * @returns Detailed agent information
 */
export async function fetchAgentInfo(httpClient: HttpClient, agentId: string): Promise<Agent> {
	const response = await httpClient.get<{ data: Agent }>(`/agents/${agentId}`);
	return response.data;
}
