/**
 * Add Agent Tool
 *
 * LangChain tool that allows AI agents to add other Thenvoi agents to the chat.
 * The agent can request help from specialized agents by calling this tool.
 *
 * Error Handling:
 * - Returns descriptive error messages for agent not found
 * - Returns informative message if agent already in chat
 * - Returns error message if API call fails
 * - All errors are user-friendly strings for the AI agent to understand
 */

import { Tool } from '@langchain/core/tools';
import { AgentBasicInfo, ChatParticipant } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { addAgentToChat } from '@lib/api';
import { isAgentParticipant, createAgentParticipantObject } from '../utils/participants';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface AddAgentToolConfig {
	httpClient: HttpClient;
	chatId: string;
	availableAgents: AgentBasicInfo[];
	currentParticipants: ChatParticipant[];
	onAgentAdded?: (agent: ChatParticipant) => void;
}

/**
 * Tool for adding agents to the current chat
 */
export class AddAgentTool extends Tool {
	name = 'add_agent_to_chat';
	description =
		'Add a specialized Thenvoi agent to this chat to help answer questions. Use this when you need expertise in a specific domain. Input should be the exact name of the agent to add.';

	private httpClient: HttpClient;
	private chatId: string;
	private availableAgents: AgentBasicInfo[];
	private currentParticipants: ChatParticipant[];
	private onAgentAdded?: (agent: ChatParticipant) => void;

	constructor(config: AddAgentToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
		this.availableAgents = config.availableAgents;
		this.currentParticipants = config.currentParticipants;
		this.onAgentAdded = config.onAgentAdded;
	}

	/**
	 * Executes the tool - validates and adds the agent to chat
	 *
	 * @param agent_name - The exact name of the agent to add (case-sensitive)
	 * @returns JSON string with result data, or error message string
	 */
	async _call(agent_name: string): Promise<string> {
		const agent = this.findAgentByName(agent_name);
		if (!agent) {
			return JSON.stringify({
				error: this.buildAgentNotFoundError(agent_name),
				availableAgents: this.availableAgents.map((a) => ({ id: a.id, name: a.name })),
			});
		}

		if (this.isAgentAlreadyInChat(agent)) {
			return JSON.stringify({
				success: true,
				message: this.buildAlreadyInChatMessage(agent),
				agent: agent,
				alreadyInChat: true,
			});
		}

		try {
			const participant = await this.addAgentToChat(agent);
			return JSON.stringify({
				success: true,
				message: this.buildSuccessMessage(agent),
				agent: agent,
				participant,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'adding agent to chat');
		}
	}

	/**
	 * Finds an agent by name in the available agents list
	 *
	 * Matching is case-sensitive to ensure exact agent identification.
	 * This tool requires precise agent names to prevent accidental additions.
	 *
	 * @param agentName - The name to search for (case-sensitive)
	 * @returns The agent if found, undefined otherwise
	 */
	private findAgentByName(agentName: string): AgentBasicInfo | undefined {
		return this.availableAgents.find((a) => a.name === agentName);
	}

	/**
	 * Checks if an agent is already in the chat participants list
	 *
	 * Compares by agent ID to ensure accurate detection even if names differ.
	 *
	 * @param agent - The agent to check
	 * @returns True if agent is already in chat, false otherwise
	 */
	private isAgentAlreadyInChat(agent: AgentBasicInfo): boolean {
		return this.currentParticipants.some((p) => isAgentParticipant(p) && p.id === agent.id);
	}

	/**
	 * Adds an agent to the chat via API and updates internal state
	 *
	 * Performs the API call, creates participant object, updates local state,
	 * and notifies the capability callback if provided.
	 *
	 * @param agent - The agent to add
	 * @returns The created participant object
	 * @throws Error if API call fails
	 */
	private async addAgentToChat(agent: AgentBasicInfo): Promise<ChatParticipant> {
		await addAgentToChat(this.httpClient, this.chatId, agent.id);

		const agentParticipant = createAgentParticipantObject(agent);

		// Update current participants list to keep state in sync
		this.currentParticipants.push(agentParticipant);

		// Notify the capability that an agent was added
		if (this.onAgentAdded) {
			this.onAgentAdded(agentParticipant);
		}

		return agentParticipant;
	}

	/**
	 * Builds error message when agent is not found
	 *
	 * Includes list of available agents to help the AI understand what's available.
	 *
	 * @param agentName - The name that was searched for
	 * @returns Error message string
	 */
	private buildAgentNotFoundError(agentName: string): string {
		const availableNames = this.availableAgents.map((a) => a.name).join(', ');
		return `Error: Agent "${agentName}" not found. Available agents: ${availableNames}`;
	}

	/**
	 * Builds informative message when agent is already in chat
	 *
	 * @param agent - The agent that's already present
	 * @returns Informative message string
	 */
	private buildAlreadyInChatMessage(agent: AgentBasicInfo): string {
		return `Agent "${agent.name}" is already in this chat and available to help.`;
	}

	/**
	 * Builds success message after adding agent
	 *
	 * Includes mention format hint to help the AI use the agent correctly.
	 *
	 * @param agent - The agent that was added
	 * @returns Success message string
	 */
	private buildSuccessMessage(agent: AgentBasicInfo): string {
		return `Successfully added "${agent.name}" to the chat. You can now mention them using "@${agent.name}" in your response if needed.`;
	}
}
