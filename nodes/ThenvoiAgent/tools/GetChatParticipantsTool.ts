/**
 * Get Chat Participants Tool
 *
 * LangChain tool that allows AI agents to fetch current participants in the chat.
 * Useful for seeing who's participating, getting user information, or checking which agents are available.
 *
 * Error Handling:
 * - Returns descriptive error messages for API failures
 * - Handles invalid participant types gracefully
 * - Returns user-friendly error messages for the AI agent
 */

import { Tool } from '@langchain/core/tools';
import { ParticipantType } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { fetchChatParticipants } from '@lib/api';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface GetChatParticipantsToolConfig {
	httpClient: HttpClient;
	chatId: string;
}

/**
 * Tool for fetching chat participants
 */
export class GetChatParticipantsTool extends Tool {
	name = 'get_chat_participants';
	description =
		'Get the list of participants currently in this chat. Use this to see who\'s participating, get user information, or check which agents are available. Input should be optional: "User" to get only users, "Agent" to get only agents, or omit for both.';

	private httpClient: HttpClient;
	private chatId: string;

	constructor(config: GetChatParticipantsToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
	}

	/**
	 * Executes the tool - fetches chat participants
	 *
	 * @param input - Optional participant type: "User", "Agent", or empty for both
	 * @returns JSON string with participant data, or error JSON string
	 */
	async _call(input: string): Promise<string> {
		try {
			const participantType = this.parseParticipantType(input);
			const participants = await fetchChatParticipants(
				this.httpClient,
				this.chatId,
				participantType,
			);

			if (participants.length === 0) {
				return JSON.stringify({
					participants: [],
					message: `No ${participantType || 'participants'} found in this chat.`,
				});
			}

			return JSON.stringify({
				participants,
				count: participants.length,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'fetching chat participants');
		}
	}

	/**
	 * Parses and validates participant type input
	 *
	 * Uses case-insensitive matching because AI agents may provide inconsistent
	 * casing when specifying participant types.
	 *
	 * @param input - String input: "User", "Agent", or empty
	 * @returns Validated participant type or undefined for both
	 */
	private parseParticipantType(input?: string): ParticipantType | undefined {
		if (!input || input.trim() === '') {
			return undefined;
		}

		const normalized = input.trim().toLowerCase();

		if (normalized === 'user') {
			return 'User';
		}

		if (normalized === 'agent') {
			return 'Agent';
		}

		// If invalid input, return undefined to get both types
		return undefined;
	}
}
