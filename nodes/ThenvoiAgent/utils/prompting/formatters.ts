/**
 * Prompt Context Formatters
 *
 * Utilities for formatting dynamic context data for prompt injection.
 * Each formatter is focused on a single responsibility.
 */

import { BaseMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { ChatMessage, ChatParticipant, ParticipantType, RoomInfo, SenderInfo } from '@lib/types';
import { PROMPT_SECTIONS } from '../../constants/promptSections';
import { DynamicPromptContext } from '../../types';
import type {
	MessageAdditionalKwargs,
	StructuredMessageData,
	StructuredToolCall,
} from '../../types/memory';
import { isAIMessage, isHumanMessage } from '../messages/messageTypeUtils';

/**
 * Sender info for formatting purposes
 * sender_id is optional since AI messages don't have sender IDs stored
 */
type FormatterSenderInfo = Omit<SenderInfo, 'sender_id'> & Partial<Pick<SenderInfo, 'sender_id'>>;

/**
 * Formatted message object for JSON output
 */
interface FormattedMessage {
	sender_id?: string;
	sender_name: string;
	sender_type: ParticipantType;
	content?: string;
	messagesSent?: string[];
	toolCalls?: StructuredToolCall[];
	thoughts?: string;
}

/**
 * Type guard to check if additional_kwargs has sender info
 */
function hasAdditionalKwargs(
	msg: BaseMessage,
): msg is BaseMessage & { additional_kwargs: MessageAdditionalKwargs } {
	return msg.additional_kwargs !== undefined;
}

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
				`  **Handle**: ${p.handle}`,
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
 * Gets sender info from a message
 *
 * For self messages:
 * - Always "Me" with type "agent" since AI messages in memory are from the current agent
 *
 * For normal chat messages:
 * - Use sender_id, sender_name, sender_type from additional_kwargs (from memory)
 * - sender_type determines if it's a user or another agent
 *
 * @param msg - The message to get sender info for
 */
function getSenderInfo(msg: BaseMessage): FormatterSenderInfo {
	// AI messages in memory are always from the current agent
	if (isAIMessage(msg)) {
		return {
			sender_name: 'Me',
			sender_type: 'Agent',
		};
	}

	// For HumanMessages, check if sender info is stored in additional_kwargs
	if (hasAdditionalKwargs(msg)) {
		const {
			sender_id: senderId,
			sender_name: senderName,
			sender_type: senderType,
		} = msg.additional_kwargs;

		if (senderName) {
			return {
				sender_id: senderId,
				sender_name: senderName,
				sender_type: senderType ?? 'User',
			};
		}
	}

	// Fallback for messages without stored sender info
	return {
		sender_name: isHumanMessage(msg) ? 'User' : 'Unknown',
		sender_type: 'User',
	};
}

/**
 * Creates base message object with sender info
 *
 * @param senderInfo - Sender information
 * @returns Base formatted message with sender fields
 */
function createBaseSenderObject(
	senderInfo: FormatterSenderInfo,
): Pick<FormattedMessage, 'sender_id' | 'sender_name' | 'sender_type'> {
	return {
		...(senderInfo.sender_id ? { sender_id: senderInfo.sender_id } : {}),
		sender_name: senderInfo.sender_name,
		sender_type: senderInfo.sender_type,
	};
}

/**
 * Formats an AI message with structured data (thoughts, tool calls, messages sent)
 *
 * @param senderInfo - Sender information for the message
 * @param structuredData - Structured data from memory (thoughts, toolCalls, messagesSent)
 * @returns Formatted message object with structured data fields
 */
function formatAIMessageWithStructuredData(
	senderInfo: FormatterSenderInfo,
	structuredData: StructuredMessageData,
): FormattedMessage {
	return {
		...createBaseSenderObject(senderInfo),
		...(structuredData.messagesSent && structuredData.messagesSent.length > 0
			? { messagesSent: structuredData.messagesSent }
			: {}),
		...(structuredData.toolCalls && structuredData.toolCalls.length > 0
			? { toolCalls: structuredData.toolCalls }
			: {}),
		...(structuredData.thoughts && structuredData.thoughts.trim().length > 0
			? { thoughts: structuredData.thoughts }
			: {}),
	};
}

/**
 * Formats a basic message with content
 *
 * @param senderInfo - Sender information for the message
 * @param content - Message content (string or complex type)
 * @returns Formatted message object with content field
 */
function formatBasicMessage(
	senderInfo: FormatterSenderInfo,
	content: BaseMessage['content'],
): FormattedMessage {
	return {
		...createBaseSenderObject(senderInfo),
		content: typeof content === 'string' ? content : JSON.stringify(content),
	};
}

/**
 * Formats a single memory message to JSON-serializable format
 *
 * @param message - BaseMessage from memory
 * @returns Formatted message object
 */
function formatSingleMemoryMessage(message: BaseMessage): FormattedMessage {
	const senderInfo = getSenderInfo(message);

	// Check for AI message with structured data
	if (isAIMessage(message) && hasAdditionalKwargs(message)) {
		const structuredData = message.additional_kwargs.thenvoi_structured_data;
		if (structuredData) {
			return formatAIMessageWithStructuredData(senderInfo, structuredData);
		}
	}

	return formatBasicMessage(senderInfo, message.content);
}

/**
 * Formats messages from memory (BaseMessage[]) as JSON
 *
 * Sender info is read from additional_kwargs (stored when saving to memory):
 * - sender_id: ID of the sender
 * - sender_name: Name of the sender (or "Me" for current agent)
 * - sender_type: "user" or "agent"
 *
 * AI messages are always from the current agent, so they show as "Me" with type "agent".
 *
 * @param messages - Array of BaseMessage objects from memory
 */
export function formatMessagesFromMemory(messages: BaseMessage[]): string {
	if (messages.length === 0) {
		return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\nNo recent messages in this conversation.`;
	}

	const jsonMessages = messages.map(formatSingleMemoryMessage);

	return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\n\`\`\`json\n${JSON.stringify(jsonMessages, null, 2)}\n\`\`\``;
}

/**
 * Formats messages from API (ChatMessage[]) as JSON
 * Uses order returned by API (no sorting)
 */
export function formatMessagesFromAPI(messages: ChatMessage[]): string {
	if (messages.length === 0) {
		return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\nNo recent messages in this conversation.`;
	}

	const jsonMessages = messages.map((m) => ({
		sender_id: m.sender_id,
		sender_name: m.sender_name,
		sender_type: m.sender_type,
		content: m.content,
		timestamp: m.inserted_at.toISOString(),
	}));

	return `${PROMPT_SECTIONS.RECENT_MESSAGES}\n\n\`\`\`json\n${JSON.stringify(jsonMessages, null, 2)}\n\`\`\``;
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
 * Uses appropriate message formatter based on source (always JSON format)
 *
 * @param context - Dynamic prompt context
 * @param messageSource - Source of messages ('memory' or 'api')
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
