/**
 * Send Message Tool
 *
 * LangChain tool that allows AI agents to send messages to the chat.
 * Enables real-time message sending during execution, allowing multiple
 * messages per execution cycle for privacy and flexibility.
 *
 * Error Handling:
 * - Validates message content is non-empty
 * - Uses centralized error formatting utilities
 * - Returns user-friendly error messages for the AI agent
 */

import { Tool } from '@langchain/core/tools';
import { ChatParticipant } from '@lib/types';
import { MessageQueue } from '../utils/messages';
import { detectMentions, createMentionMetadata } from '../utils/mentions';
import { formatToolErrorResponse } from '../utils/errors';
import { formatToolSuccess, formatToolError } from '../utils/toolResult';

export const SEND_MESSAGE_TOOL_ID = 'SendMessageTool';

/**
 * Tool configuration dependencies
 */
export interface SendMessageToolConfig {
	messageQueue: MessageQueue;
	participants: ChatParticipant[];
}

/**
 * Tool for sending messages to the chat
 */
export class SendMessageTool extends Tool {
	name = 'send_message';
	description =
		'Sends a message to the Thenvoi chat room. Input: message content string (one message per call). Can be called multiple times per execution.';

	private messageQueue: MessageQueue;
	private participants: ChatParticipant[];

	constructor(config: SendMessageToolConfig) {
		super();
		this.messageQueue = config.messageQueue;
		this.participants = config.participants;
	}

	/**
	 * Executes the tool - validates and sends the message
	 *
	 * @param content - The message content to send
	 * @returns JSON string with result data, or error message string
	 */
	async _call(content: string): Promise<string> {
		if (!content || content.trim() === '') {
			return formatToolError('Message content cannot be empty');
		}

		try {
			const mentions = detectMentions(content, this.participants);

			if (mentions.length === 0) {
				return formatToolError(
					'Message must include at least one @mention using @handle format (e.g., "@john.doe/executive-assistant"). Name is not valid. Check CHAT PARTICIPANTS for handles.',
				);
			}

			const { mentions: mentionMetadata } = createMentionMetadata(content, mentions);

			this.messageQueue.enqueue('text', content, mentionMetadata);

			return formatToolSuccess({ message: 'Message sent' });
		} catch (error) {
			return formatToolErrorResponse(error, 'sending message');
		}
	}
}
