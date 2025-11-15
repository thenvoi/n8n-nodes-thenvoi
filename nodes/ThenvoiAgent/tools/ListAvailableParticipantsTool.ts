/**
 * List Available Participants Tool
 *
 * LangChain tool that allows AI agents to discover which participants
 * (agents and users) can be added to the current chat room.
 * Useful for finding available agents before adding them.
 *
 * Error Handling:
 * - Returns descriptive error messages for API failures
 * - Returns user-friendly error messages for the AI agent
 */

import { Tool } from '@langchain/core/tools';
import { ChatParticipant } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { fetchAllAvailableParticipants } from '@lib/api';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface ListAvailableParticipantsToolConfig {
	httpClient: HttpClient;
	chatId: string;
}

/**
 * Tool for listing available participants that can be added to chat
 */
export class ListAvailableParticipantsTool extends Tool {
	name = 'list_available_participants';
	description =
		'Lists all participants (agents and users) that can be added to the current chat room. Use this to discover available participants and get their IDs before adding them with add_participant_to_chat. Returns participant IDs, names, types, and descriptions. No input required.';

	private httpClient: HttpClient;
	private chatId: string;

	constructor(config: ListAvailableParticipantsToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
	}

	/**
	 * Executes the tool - fetches and returns available participants
	 *
	 * @param _input - Not used (tool requires no input)
	 * @returns JSON string with available participants data, or error JSON string
	 */
	async _call(_input: string): Promise<string> {
		try {
			const participants = await fetchAllAvailableParticipants(this.httpClient, this.chatId);

			const formattedParticipants = this.formatParticipants(participants);

			return JSON.stringify({
				participants: formattedParticipants,
				count: formattedParticipants.length,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'listing available participants');
		}
	}

	/**
	 * Formats ChatParticipant data into tool response format
	 *
	 * @param participants - Array of chat participants
	 * @returns Array of formatted participant objects with description
	 */
	private formatParticipants(
		participants: ChatParticipant[],
	): Array<{ id: string; name: string; type: string; description: string }> {
		return participants.map((participant) => ({
			id: participant.id,
			name: participant.name,
			type: participant.type.toLowerCase(),
			description: participant.description || '',
		}));
	}
}
