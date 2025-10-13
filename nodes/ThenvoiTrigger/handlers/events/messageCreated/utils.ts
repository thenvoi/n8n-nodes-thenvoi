import { Logger } from 'n8n-workflow';
import { ChatMessage, N8NMessageResponse } from '../../../types/chatMessage';

/**
 * Checks if a message contains a mention to the specified user using metadata
 */
export function containsMention(data: ChatMessage, userId: string, logger?: Logger): boolean {
	if (!data || !data.metadata || !userId) {
		logger?.debug('MentionFilter: Invalid data or userId', {
			hasData: !!data,
			hasMetadata: !!data?.metadata,
			hasUserId: !!userId,
		});
		return false;
	}

	// Check if mentions array exists and has items
	if (!data.metadata.mentions || data.metadata.mentions.length === 0) {
		logger?.debug('MentionFilter: No mentions in metadata', {
			mentions: data.metadata.mentions,
		});
		return false;
	}

	// Check if the specified userId is in the mentions array
	const hasMention = data.metadata.mentions.some((mention) => mention.id === userId);

	logger?.debug('MentionFilter: Checking mention using metadata', {
		userId,
		mentions: data.metadata.mentions,
		hasMention,
	});

	return hasMention;
}

/**
 * Removes mentions from message content using metadata
 */
export function removeMentionsFromContent(
	content: string,
	data: ChatMessage,
	userId: string,
): string {
	if (!content || !data?.metadata?.mentions || !userId) {
		return content;
	}

	// Find the mention in metadata to get the exact username format
	const mention = data.metadata.mentions.find((m) => m.id === userId);

	if (!mention) {
		return content;
	}

	// Remove the mention using the exact username from metadata
	const mentionPattern = new RegExp(
		`@${mention.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
		'g',
	);

	// Remove the mention and clean up extra spaces
	return content.replace(mentionPattern, '').replace(/\s+/g, ' ').trim();
}

/**
 * Creates simplified message data for n8n workflow
 */
export function createMessageResponse(data: ChatMessage, userId: string): N8NMessageResponse {
	// Remove mentions from content
	const contentWithoutMention = removeMentionsFromContent(data.content, data, userId);

	return {
		id: data.id,
		content: contentWithoutMention,
		originalContent: data.content,
		sender: {
			id: data.sender_id,
			type: data.sender_type,
		},
		chat_room_id: data.chat_room_id,
	};
}
