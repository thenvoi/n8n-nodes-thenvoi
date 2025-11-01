/**
 * Get Agent Info Tool
 *
 * LangChain tool that allows AI agents to fetch detailed information about a specific agent.
 * Useful when the agent needs specific details about another agent's capabilities or configuration.
 *
 * Error Handling:
 * - Returns descriptive error messages for agent not found
 * - Returns error message if API call fails
 * - All errors are user-friendly strings for the AI agent to understand
 */

import { Tool } from '@langchain/core/tools';
import { fetchAgentInfo } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { AgentBasicInfo } from '@lib/types';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface GetAgentInfoToolConfig {
	httpClient: HttpClient;
	availableAgents: AgentBasicInfo[];
}

/**
 * Tool for fetching detailed agent information
 */
export class GetAgentInfoTool extends Tool {
	name = 'get_agent_info';
	description =
		"Get detailed information about a specific agent. Use this when you need to know about an agent's capabilities, description, or configuration. Input should be the agent ID or exact name of the agent.";

	private httpClient: HttpClient;
	private availableAgents: AgentBasicInfo[];

	constructor(config: GetAgentInfoToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.availableAgents = config.availableAgents;
	}

	/**
	 * Executes the tool - fetches agent information
	 *
	 * @param input - Agent ID or name
	 * @returns JSON string with agent data, or error message string
	 */
	async _call(input: string): Promise<string> {
		if (!input || input.trim() === '') {
			return JSON.stringify({
				error: 'Please provide an agent ID or name.',
			});
		}

		try {
			const agentId = this.findAgentId(input.trim());

			if (!agentId) {
				return JSON.stringify({
					error: this.buildAgentNotFoundError(input),
					availableAgents: this.availableAgents.map((a) => ({ id: a.id, name: a.name })),
				});
			}

			const agent = await fetchAgentInfo(this.httpClient, agentId);
			return JSON.stringify({ agent });
		} catch (error) {
			return formatToolErrorResponse(error, 'fetching agent information');
		}
	}

	/**
	 * Finds agent ID by name or uses input as ID
	 *
	 * Uses case-insensitive matching for agent names because AI agents may
	 * provide inconsistent casing when referencing agent names.
	 *
	 * @param input - Agent name or ID
	 * @returns Agent ID if found, or undefined
	 */
	private findAgentId(input: string): string | undefined {
		// First check if input is an agent name (case-insensitive for AI agent input stability)
		const agentByName = this.availableAgents.find(
			(a) => a.name.toLowerCase() === input.toLowerCase(),
		);

		if (agentByName) {
			return agentByName.id;
		}

		// Check if input is an agent ID
		const agentById = this.availableAgents.find((a) => a.id === input);

		if (agentById) {
			return agentById.id;
		}

		// If not found in available agents list, try using input as ID directly
		// (in case the agent exists but wasn't in the available list)
		return input;
	}

	/**
	 * Builds error message when agent is not found
	 *
	 * @param input - The input that was searched for
	 * @returns Error message string
	 */
	private buildAgentNotFoundError(input: string): string {
		const availableNames = this.availableAgents.map((a) => a.name).join(', ');

		return `Error: Agent "${input}" not found. Available agents: ${availableNames || 'None'}`;
	}
}
