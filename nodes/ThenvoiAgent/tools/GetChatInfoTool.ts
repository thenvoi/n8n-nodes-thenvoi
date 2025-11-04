/**
 * Get Chat Info Tool
 *
 * LangChain tool that allows AI agents to fetch information about the current chat room.
 * Useful for getting chat metadata like title, type, status, etc.
 *
 * Error Handling:
 * - Returns descriptive error messages for API failures
 * - Returns user-friendly error messages for the AI agent
 */

import { Tool } from '@langchain/core/tools';
import { HttpClient } from '@lib/http/client';
import { fetchChatRoom } from '@lib/api';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface GetChatInfoToolConfig {
	httpClient: HttpClient;
	chatId: string;
}

/**
 * Tool for fetching chat room information
 */
export class GetChatInfoTool extends Tool {
	name = 'get_chat_info';
	description =
		'Get information about the current chat room, including title, type, status, and creation date. Use this when you need metadata about the chat. No input required.';

	private httpClient: HttpClient;
	private chatId: string;

	constructor(config: GetChatInfoToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
	}

	/**
	 * Executes the tool - fetches chat room information
	 *
	 * @param _input - Not used (tool requires no input)
	 * @returns JSON string with chat room data, or error JSON string
	 */
	async _call(_input: string): Promise<string> {
		try {
			const chatRoom = await fetchChatRoom(this.httpClient, this.chatId);
			return JSON.stringify({ chatRoom });
		} catch (error) {
			return formatToolErrorResponse(error, 'fetching chat information');
		}
	}
}
