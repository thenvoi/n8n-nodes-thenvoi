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

import type { Logger } from 'n8n-workflow';
import { Tool } from '@langchain/core/tools';
import { fetchAllAvailableParticipants } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { Peer } from '@lib/types';
import { formatToolErrorResponse } from '../utils/errors';
import { formatToolSuccess } from '../utils/toolResult';

/**
 * Tool configuration dependencies
 */
export interface ListAvailableParticipantsToolConfig {
	httpClient: HttpClient;
	chatId: string;
	logger: Logger;
}

/**
 * Tool for listing available participants that can be added to chat
 */
export class ListAvailableParticipantsTool extends Tool {
	name = 'list_available_participants';
	description =
		'Lists all participants (agents and users) that can be added to the current chat room. Use this to discover available participants and get their IDs and handles before adding them with add_participant_to_chat. Returns participant IDs, names, handles (required for mentions), types, and descriptions. No input required.';

	private httpClient: HttpClient;
	private chatId: string;
	private logger: Logger;

	constructor(config: ListAvailableParticipantsToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
		this.logger = config.logger;
	}

	/**
	 * Executes the tool - fetches and returns available participants
	 *
	 * @param _input - Not used (tool requires no input)
	 * @returns JSON string with available participants data, or error JSON string
	 */
	async _call(_input: string): Promise<string> {
		try {
			const participants = await fetchAllAvailableParticipants(
			this.httpClient,
			this.chatId,
			this.logger,
		);

			const formattedParticipants = this.formatParticipants(participants);

			return formatToolSuccess({
				participants: formattedParticipants,
				count: formattedParticipants.length,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'listing available participants');
		}
	}

	/**
	 * Formats Peer data into tool response format
	 *
	 * @param participants - Array of peers
	 * @returns Array of formatted participant objects
	 */
	private formatParticipants(
		participants: Peer[],
	): Array<{ id: string; name: string; handle: string; type: string; description: string }> {
		return participants.map((participant) => ({
			id: participant.id,
			name: participant.name,
			handle: participant.handle,
			type: participant.type,
			description: participant.description || '',
		}));
	}
}
