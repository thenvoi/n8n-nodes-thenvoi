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
import { addParticipantToChat } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { ChatParticipant, Peer } from '@lib/types';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface AddParticipantToolConfig {
	httpClient: HttpClient;
	chatId: string;
	availableParticipants: Peer[];
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
	private availableParticipants: Peer[];
	private currentParticipants: ChatParticipant[];
	private onParticipantAdded?: (participant: ChatParticipant) => void;

	constructor(config: AddParticipantToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
		this.availableParticipants = config.availableParticipants;
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
		const participant =
			this.findParticipantById(participant_identifier) ||
			this.findParticipantByName(participant_identifier);
		if (!participant) {
			return JSON.stringify({
				error: this.buildParticipantNotFoundError(participant_identifier),
				availableParticipants: this.availableParticipants.map((p) => ({
					id: p.id,
					name: p.name,
					type: p.type,
				})),
			});
		}

		if (this.isParticipantAlreadyInChat(participant)) {
			return JSON.stringify({
				success: true,
				message: this.buildAlreadyInChatMessage(participant),
				participant: this.createChatParticipant(participant),
				alreadyInChat: true,
			});
		}

		try {
			const chatParticipant = await this.addParticipant(participant);
			return JSON.stringify({
				success: true,
				message: this.buildSuccessMessage(participant),
				participant: chatParticipant,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'adding participant to chat');
		}
	}

	/**
	 * Finds a participant by ID in the available participants list
	 *
	 * @param participantId - The ID (UUID) to search for
	 * @returns The participant if found, undefined otherwise
	 */
	private findParticipantById(participantId: string): Peer | undefined {
		return this.availableParticipants.find((p) => p.id === participantId);
	}

	/**
	 * Finds a participant by name in the available participants list
	 *
	 * Matching is case-sensitive to ensure exact participant identification.
	 * This tool requires precise names to prevent accidental additions.
	 *
	 * @param participantName - The name to search for (case-sensitive)
	 * @returns The participant if found, undefined otherwise
	 */
	private findParticipantByName(participantName: string): Peer | undefined {
		return this.availableParticipants.find((p) => p.name === participantName);
	}

	/**
	 * Checks if a participant is already in the chat participants list
	 *
	 * Compares by participant ID to ensure accurate detection even if names differ.
	 *
	 * @param participant - The participant to check
	 * @returns True if participant is already in chat, false otherwise
	 */
	private isParticipantAlreadyInChat(participant: Peer): boolean {
		return this.currentParticipants.some((p) => p.id === participant.id);
	}

	/**
	 * Adds a participant to the chat via API and updates internal state
	 *
	 * Performs the API call, creates participant object, updates local state,
	 * and notifies the capability callback if provided.
	 *
	 * @param participant - The participant to add
	 * @returns The created participant object
	 * @throws Error if API call fails
	 */
	private async addParticipant(participant: Peer): Promise<ChatParticipant> {
		await addParticipantToChat(this.httpClient, this.chatId, participant.id);

		const chatParticipant = this.createChatParticipant(participant);

		// Update current participants list to keep state in sync
		this.currentParticipants.push(chatParticipant);

		// Notify the capability that a participant was added
		if (this.onParticipantAdded) {
			this.onParticipantAdded(chatParticipant);
		}

		return chatParticipant;
	}

	/**
	 * Creates a ChatParticipant from Peer
	 *
	 * @param participant - The peer to convert
	 * @returns ChatParticipant object
	 */
	private createChatParticipant(participant: Peer): ChatParticipant {
		return {
			id: participant.id,
			name: participant.name,
			type: participant.type,
			description: participant.description || undefined,
		};
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
		const availableNames = this.availableParticipants.map((p) => p.name).join(', ');
		return `Error: Participant "${participantName}" not found. Available participants: ${availableNames}`;
	}

	/**
	 * Builds informative message when participant is already in chat
	 *
	 * @param participant - The participant that's already present
	 * @returns Informative message string
	 */
	private buildAlreadyInChatMessage(participant: Peer): string {
		return `Participant "${participant.name}" is already in this chat and ready to help. You can now communicate with them by mentioning them with "@${participant.name}" in your response. Do NOT call add_participant_to_chat again - proceed directly to your question or message.`;
	}

	/**
	 * Builds success message after adding participant
	 *
	 * Includes clear instructions on how to proceed and not to call the tool again.
	 *
	 * @param participant - The participant that was added
	 * @returns Success message string
	 */
	private buildSuccessMessage(participant: Peer): string {
		return `Successfully added "${participant.name}" to the chat. You can now communicate with them by mentioning them with "@${participant.name}" in your response. Do NOT call add_participant_to_chat again - proceed directly to your question or message.`;
	}
}
