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
		'MANDATORY: Use this tool to send ANY message to users. You MUST use this tool for ALL messages to users - never output text directly as a final answer. This applies to: direct responses, responses from other agents, acknowledgments, questions, and any information for users. You can call this tool multiple times in a single execution to send multiple messages. IMPORTANT: When asked to send multiple messages, call this tool once for EACH message (e.g., if asked for 5 messages, call send_message 5 times with different content). CRITICAL PRIVACY: If your message contains user information, questions to the user, or user context, send it as a separate message (do NOT include agent mentions). Use separate send_message calls to keep user information separate from agent mentions. Example: First call sends "Sure, I\'ll ask the weather assistant!" to user, second call sends "@Weather Assistant What\'s the weather in Houston?" to agent. Input: The message content as a string (ONE message per call). Mentions will be automatically detected from @Name format.';

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
			return JSON.stringify({
				error: 'Message content cannot be empty',
			});
		}

		try {
			const mentions = detectMentions(content, this.participants);
			const { mentions: mentionMetadata } = createMentionMetadata(content, mentions);

			this.messageQueue.enqueue('text', content, mentionMetadata);

			return JSON.stringify({
				success: true,
				message: 'Message sent',
			});
		} catch (error) {
			return formatToolErrorResponse(error, 'sending message');
		}
	}
}
