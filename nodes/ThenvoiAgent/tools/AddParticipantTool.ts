/**
 * Add Participant Tool
 *
 * LangChain tool that allows AI agents to add participants (agents or users) to the chat.
 * The agent can request help from specialized agents or add users by calling this tool.
 *
 * Error Handling:
 * - Returns descriptive error messages for participant not found
 * - Returns informative message if participant already in chat
 * - Returns error message if API call fails
 * - All errors are user-friendly strings for the AI agent to understand
 */

import { Tool } from '@langchain/core/tools';
import { addAgentToChat } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { AgentBasicInfo, ChatParticipant } from '@lib/types';
import { formatToolErrorResponse } from '../utils/errors';
import { createAgentParticipantObject, isAgentParticipant } from '../utils/participants';

/**
 * Tool configuration dependencies
 */
export interface AddParticipantToolConfig {
	httpClient: HttpClient;
	chatId: string;
	availableAgents: AgentBasicInfo[];
	currentParticipants: ChatParticipant[];
	onParticipantAdded?: (participant: ChatParticipant) => void;
}

/**
 * Tool for adding participants to the current chat
 */
export class AddParticipantTool extends Tool {
	name = 'add_participant_to_chat';
	description =
		'Add a new participant (agent or user) to the current chat room. Check CHAT PARTICIPANTS section before adding to avoid duplicates. Use list_available_participants to get participant IDs or names. Input should be either the participant ID (UUID) or the exact name of the participant to add. IMPORTANT: Only call this ONCE per participant. If the participant is already in chat or successfully added, do NOT call this tool again.';

	private httpClient: HttpClient;
	private chatId: string;
	private availableAgents: AgentBasicInfo[];
	private currentParticipants: ChatParticipant[];
	private onParticipantAdded?: (participant: ChatParticipant) => void;

	constructor(config: AddParticipantToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
		this.availableAgents = config.availableAgents;
		this.currentParticipants = config.currentParticipants;
		this.onParticipantAdded = config.onParticipantAdded;
	}

	/**
	 * Executes the tool - validates and adds the participant to chat
	 *
	 * Accepts either participant ID (UUID) or name. Tries ID first, then falls back to name.
	 *
	 * @param participant_identifier - Either the participant ID (UUID) or the exact name (case-sensitive)
	 * @returns JSON string with result data, or error message string
	 */
	async _call(participant_identifier: string): Promise<string> {
		// Try to find by ID first (UUID format), then fall back to name
		const agent =
			this.findAgentById(participant_identifier) || this.findAgentByName(participant_identifier);
		if (!agent) {
			return JSON.stringify({
				error: this.buildParticipantNotFoundError(participant_identifier),
				availableAgents: this.availableAgents.map((a) => ({ id: a.id, name: a.name })),
			});
		}

		if (this.isParticipantAlreadyInChat(agent)) {
			return JSON.stringify({
				success: true,
				message: this.buildAlreadyInChatMessage(agent),
				participant: agent,
				alreadyInChat: true,
			});
		}

		try {
			const participant = await this.addParticipantToChat(agent);
			return JSON.stringify({
				success: true,
				message: this.buildSuccessMessage(agent),
				participant,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'adding participant to chat');
		}
	}

	/**
	 * Finds an agent by ID in the available agents list
	 *
	 * @param participantId - The ID (UUID) to search for
	 * @returns The agent if found, undefined otherwise
	 */
	private findAgentById(participantId: string): AgentBasicInfo | undefined {
		return this.availableAgents.find((a) => a.id === participantId);
	}

	/**
	 * Finds an agent by name in the available agents list
	 *
	 * Matching is case-sensitive to ensure exact participant identification.
	 * This tool requires precise names to prevent accidental additions.
	 *
	 * @param participantName - The name to search for (case-sensitive)
	 * @returns The agent if found, undefined otherwise
	 */
	private findAgentByName(participantName: string): AgentBasicInfo | undefined {
		return this.availableAgents.find((a) => a.name === participantName);
	}

	/**
	 * Checks if a participant is already in the chat participants list
	 *
	 * Compares by participant ID to ensure accurate detection even if names differ.
	 *
	 * @param agent - The agent to check
	 * @returns True if participant is already in chat, false otherwise
	 */
	private isParticipantAlreadyInChat(agent: AgentBasicInfo): boolean {
		return this.currentParticipants.some((p) => isAgentParticipant(p) && p.id === agent.id);
	}

	/**
	 * Adds a participant to the chat via API and updates internal state
	 *
	 * Performs the API call, creates participant object, updates local state,
	 * and notifies the capability callback if provided.
	 *
	 * @param agent - The agent to add
	 * @returns The created participant object
	 * @throws Error if API call fails
	 */
	private async addParticipantToChat(agent: AgentBasicInfo): Promise<ChatParticipant> {
		await addAgentToChat(this.httpClient, this.chatId, agent.id);

		const participant = createAgentParticipantObject(agent);

		// Update current participants list to keep state in sync
		this.currentParticipants.push(participant);

		// Notify the capability that a participant was added
		if (this.onParticipantAdded) {
			this.onParticipantAdded(participant);
		}

		return participant;
	}

	/**
	 * Builds error message when participant is not found
	 *
	 * Includes list of available participants to help the AI understand what's available.
	 *
	 * @param participantName - The name that was searched for
	 * @returns Error message string
	 */
	private buildParticipantNotFoundError(participantName: string): string {
		const availableNames = this.availableAgents.map((a) => a.name).join(', ');
		return `Error: Participant "${participantName}" not found. Available participants: ${availableNames}`;
	}

	/**
	 * Builds informative message when participant is already in chat
	 *
	 * @param agent - The agent that's already present
	 * @returns Informative message string
	 */
	private buildAlreadyInChatMessage(agent: AgentBasicInfo): string {
		return `Participant "${agent.name}" is already in this chat and ready to help. You can now communicate with them by mentioning them with "@${agent.name}" in your response. Do NOT call add_participant_to_chat again - proceed directly to your question or message.`;
	}

	/**
	 * Builds success message after adding participant
	 *
	 * Includes clear instructions on how to proceed and not to call the tool again.
	 *
	 * @param agent - The agent that was added
	 * @returns Success message string
	 */
	private buildSuccessMessage(agent: AgentBasicInfo): string {
		return `Successfully added "${agent.name}" to the chat. You can now communicate with them by mentioning them with "@${agent.name}" in your response. Do NOT call add_participant_to_chat again - proceed directly to your question or message.`;
	}
}
