import { HttpClient } from '../http/client';
import { Agent, AgentBasicInfo } from '../types';

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
