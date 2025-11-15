/**
 * Remove Participant Tool
 *
 * LangChain tool that allows AI agents to remove participants from the chat.
 * Should be used sparingly - typically only when explicitly requested by users
 * or when a participant's task is complete and they're no longer needed.
 *
 * Error Handling:
 * - Returns descriptive error messages for participant not found
 * - Returns informative message for permission errors
 * - Returns error message if API call fails
 * - All errors are user-friendly strings for the AI agent to understand
 */

import { Tool } from '@langchain/core/tools';
import { ChatParticipant } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { removeParticipantFromChat } from '@lib/api';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface RemoveParticipantToolConfig {
	httpClient: HttpClient;
	chatId: string;
	currentParticipants: ChatParticipant[];
	onParticipantRemoved?: (participantId: string) => void;
}

/**
 * Tool for removing participants from the current chat
 */
export class RemoveParticipantTool extends Tool {
	name = 'remove_participant_from_chat';
	description =
		'Removes a participant from the current chat room. Use only when explicitly requested by user or when participant is no longer needed. Input should be the participant_id (UUID) from CHAT PARTICIPANTS section. Use sparingly - removing participants is a significant action.';

	private httpClient: HttpClient;
	private chatId: string;
	private currentParticipants: ChatParticipant[];
	private onParticipantRemoved?: (participantId: string) => void;

	constructor(config: RemoveParticipantToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
		this.currentParticipants = config.currentParticipants;
		this.onParticipantRemoved = config.onParticipantRemoved;
	}

	/**
	 * Executes the tool - validates and removes the participant from chat
	 *
	 * @param participantId - The UUID of the participant to remove
	 * @returns JSON string with result data, or error message string
	 */
	async _call(participantId: string): Promise<string> {
		const trimmedId = participantId.trim();

		if (!trimmedId) {
			return JSON.stringify({
				error: 'Participant ID is required',
			});
		}

		const participant = this.findParticipantById(trimmedId);
		if (!participant) {
			return JSON.stringify({
				error: `Participant with ID "${trimmedId}" not found in chat. Check the CHAT PARTICIPANTS section for valid participant IDs.`,
			});
		}

		try {
			await removeParticipantFromChat(this.httpClient, this.chatId, trimmedId);

			// Update internal state
			this.removeFromParticipantsList(trimmedId);

			// Notify callback
			if (this.onParticipantRemoved) {
				this.onParticipantRemoved(trimmedId);
			}

			return JSON.stringify({
				success: true,
				message: `Successfully removed "${participant.name}" from the chat.`,
				participantId: trimmedId,
				participantName: participant.name,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'removing participant from chat');
		}
	}

	/**
	 * Finds a participant by ID in the current participants list
	 *
	 * @param participantId - The ID to search for
	 * @returns The participant if found, undefined otherwise
	 */
	private findParticipantById(participantId: string): ChatParticipant | undefined {
		return this.currentParticipants.find((p) => p.id === participantId);
	}

	/**
	 * Removes a participant from the internal participants list
	 *
	 * Updates local state to keep it in sync with the API state.
	 *
	 * @param participantId - The ID of the participant to remove
	 */
	private removeFromParticipantsList(participantId: string): void {
		const index = this.currentParticipants.findIndex((p) => p.id === participantId);
		if (index !== -1) {
			this.currentParticipants.splice(index, 1);
		}
	}
}
