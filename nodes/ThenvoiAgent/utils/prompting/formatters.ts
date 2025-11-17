/**
 * Prompt Context Formatters
 *
 * Utilities for formatting dynamic context data for prompt injection.
 * Each formatter is focused on a single responsibility.
 *
 * Following CODE_STYLE_PREFERENCES.MD:
 * - SRP: Each function formats one specific section
 * - Pure functions: No side effects
 * - Clear naming: Function names describe their purpose
 * - Type safety: Proper interfaces for all inputs
 */

import { DynamicPromptContext } from '../../types';
import { ChatParticipant, RoomInfo, ChatMessage } from '@lib/types';
import { StructuredTool } from '@langchain/core/tools';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { PROMPT_SECTIONS } from '../../constants/promptSections';

/**
 * Formats chat room information section
 * Shows only: ID, Title, Created Date
 */
export function formatChatRoomInfo(roomInfo: RoomInfo): string {
	const createdDate = roomInfo.inserted_at
		? new Date(roomInfo.inserted_at).toLocaleString()
		: 'Unknown';

	return [
		PROMPT_SECTIONS.CURRENT_CHAT_ROOM,
		'',
		`- **Chat Room ID**: ${roomInfo.id}`,
		`- **Title**: ${roomInfo.title}`,
		`- **Created**: ${createdDate}`,
	].join('\n');
}

/**
 * Formats participants section
 * Type should be "User" or "Agent" (API returns these values)
 */
export function formatParticipants(participants: ChatParticipant[]): string {
	if (participants.length === 0) {
		return `${PROMPT_SECTIONS.CHAT_PARTICIPANTS}\n\nNo participants in this chat yet.`;
	}

	const formatted = participants
		.map((p) => {
			const parts = [
				`- **ID**: ${p.id}`,
				`  **Name**: ${p.name}`,
				`  **Type**: ${p.type}`,
				`  **Role**: ${p.role}`,
			];

			if (p.type === 'Agent' && p.description) {
				parts.push(`  **Description**: ${p.description}`);
			}

			return parts.join('\n');
		})
		.join('\n\n');

	return `${PROMPT_SECTIONS.CHAT_PARTICIPANTS}\n\n${formatted}`;
}

/**
 * Formats a single BaseMessage (from memory)
 */
function formatBaseMessage(message: BaseMessage): string {
	const getType = (msg: BaseMessage): string => {
		if (msg instanceof HumanMessage) return 'User';
		if (msg instanceof AIMessage) return 'Assistant';
		if (msg instanceof SystemMessage) return 'System';
		return 'Unknown';
	};

	const type = getType(message);
	const content =
		typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

	return `**[${type}]**: ${content}`;
}

/**
 * Formats a single ChatMessage (from API)
 */
function formatChatMessage(message: ChatMessage): string {
	const timestamp = message.inserted_at.toISOString();
	return `**[${timestamp}] ${message.sender_name}**: ${message.content}`;
}

/**
 * Formats messages from memory (BaseMessage[])
 */
export function formatMessagesFromMemory(messages: BaseMessage[]): string {
	if (messages.length === 0) {
		return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\nNo recent messages in this conversation.`;
	}

	const formatted = messages.map((m) => formatBaseMessage(m)).join('\n\n');
	return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\n${formatted}`;
}

/**
 * Formats messages from API (ChatMessage[])
 * Uses order returned by API (no sorting)
 */
export function formatMessagesFromAPI(messages: ChatMessage[]): string {
	if (messages.length === 0) {
		return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\nNo recent messages in this conversation.`;
	}

	const formatted = messages.map((m) => formatChatMessage(m)).join('\n\n');
	return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\n${formatted}`;
}

/**
 * Formats available tools section
 */
export function formatTools(tools: StructuredTool[]): string {
	if (tools.length === 0) {
		return `${PROMPT_SECTIONS.AVAILABLE_TOOLS}\n\nNo tools available.`;
	}

	const formatted = tools.map((tool) => `**${tool.name}**\n${tool.description}`).join('\n\n');

	return `${PROMPT_SECTIONS.AVAILABLE_TOOLS}\n\n${formatted}`;
}

/**
 * Formats all dynamic context sections
 * Uses appropriate message formatter based on source
 */
export function formatDynamicContext(
	context: DynamicPromptContext,
	messageSource: 'memory' | 'api',
): {
	roomInfo: string;
	participants: string;
	messages: string;
	tools: string;
} {
	const messages =
		messageSource === 'memory'
			? formatMessagesFromMemory(context.recentMessages as BaseMessage[])
			: formatMessagesFromAPI(context.recentMessages as ChatMessage[]);

	return {
		roomInfo: formatChatRoomInfo(context.roomInfo),
		participants: formatParticipants(context.participants),
		messages,
		tools: formatTools(context.tools),
	};
}
