/**
 * Get Chat Messages Tool
 *
 * LangChain tool that allows AI agents to fetch chat message history.
 * The agent should check its memory first before using this tool.
 *
 * Error Handling:
 * - Returns descriptive error messages for API failures
 * - Handles invalid input parameters gracefully
 * - Returns user-friendly error messages for the AI agent
 */

import { Tool } from '@langchain/core/tools';
import { fetchChatMessages } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { CHAT_MESSAGE_TYPES, ChatMessageType } from '@lib/types';
import { formatToolErrorResponse } from '../utils/errors';

/**
 * Tool configuration dependencies
 */
export interface GetChatMessagesToolConfig {
	httpClient: HttpClient;
	chatId: string;
}

/**
 * Message fetching limits
 */
export const MESSAGE_FETCH_LIMITS = {
	MIN: 1,
	MAX: 50,
	DEFAULT: 20,
} as const;

/**
 * Tool for fetching chat message history
 *
 * Critical: This tool should only be used when information is NOT available
 * in the agent's conversation memory. The memory system contains recent
 * conversation history - always check memory first.
 */
export class GetChatMessagesTool extends Tool {
	name = 'get_chat_messages';
	description =
		'ONLY use this tool when information is NOT available in your conversation memory. Your memory system contains recent conversation history - always check your memory first before using this tool. Use this only for historical messages beyond your memory scope or when you need to reference very old conversations. Input should be a JSON string with optional parameters: {"message_type": "text", "since": "2025-01-01T00:00:00Z", "per_page": 20}. Maximum limit is 50 messages per request.';

	private httpClient: HttpClient;
	private chatId: string;

	constructor(config: GetChatMessagesToolConfig) {
		super();
		this.httpClient = config.httpClient;
		this.chatId = config.chatId;
	}

	/**
	 * Executes the tool - fetches chat messages
	 *
	 * @param input - JSON string with optional parameters: message_type, since, limit
	 * @returns JSON string with message data, or error JSON string
	 */
	async _call(input: string): Promise<string> {
		try {
			const params = this.parseInput(input);
			const messages = await fetchChatMessages(this.httpClient, this.chatId, params);

			if (messages.length === 0) {
				return JSON.stringify({
					messages: [],
					message: 'No messages found matching the criteria.',
				});
			}

			return JSON.stringify({
				messages,
				count: messages.length,
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'fetching chat messages');
		}
	}

	/**
	 * Parses and validates input parameters
	 *
	 * @param input - JSON string or empty string
	 * @returns Parsed parameters with defaults
	 */
	private parseInput(input: string): {
		per_page?: number;
		since?: string;
		message_type?: ChatMessageType;
	} {
		if (!input || input.trim() === '') {
			return { per_page: MESSAGE_FETCH_LIMITS.DEFAULT };
		}

		try {
			const parsed = JSON.parse(input) as {
				limit?: number;
				per_page?: number;
				since?: string;
				message_type?: ChatMessageType;
			};

			const limit = parsed.limit || parsed.per_page || MESSAGE_FETCH_LIMITS.DEFAULT;
			const validatedLimit = Math.min(
				Math.max(limit, MESSAGE_FETCH_LIMITS.MIN),
				MESSAGE_FETCH_LIMITS.MAX,
			);

			return {
				per_page: validatedLimit,
				...this.parseSince(parsed.since),
				...this.parseMessageType(parsed.message_type),
			};
		} catch {
			// If JSON parsing fails, return defaults
			return { per_page: MESSAGE_FETCH_LIMITS.DEFAULT };
		}
	}

	/**
	 * Parses and validates the since parameter
	 *
	 * @param since - ISO timestamp string
	 * @returns Validated since parameter or undefined
	 */
	private parseSince(since?: string): { since?: string } {
		if (!since || typeof since !== 'string') {
			return {};
		}

		// Basic validation - check if it's a valid ISO date
		const date = new Date(since);
		if (isNaN(date.getTime())) {
			return {};
		}

		return { since };
	}

	/**
	 * Type guard to check if a string is a valid ChatMessageType
	 *
	 * @param value - Value to check
	 * @returns True if value is a valid ChatMessageType
	 */
	private isValidChatMessageType(value: string): value is ChatMessageType {
		return CHAT_MESSAGE_TYPES.includes(value);
	}

	/**
	 * Parses and validates the message_type parameter
	 *
	 * Uses type guard to ensure type safety without assertions
	 *
	 * @param messageType - Message type string
	 * @returns Validated message type or undefined
	 */
	private parseMessageType(messageType?: ChatMessageType | string): {
		message_type?: ChatMessageType;
	} {
		if (!messageType || typeof messageType !== 'string') {
			return {};
		}

		if (this.isValidChatMessageType(messageType)) {
			return { message_type: messageType };
		}

		return {};
	}
}
