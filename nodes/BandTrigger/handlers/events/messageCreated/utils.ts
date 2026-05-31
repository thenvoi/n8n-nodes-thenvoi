import { ChatMessage, N8NMessageResponse } from '@lib/types';
import { escapeRegex } from '@lib/utils/strings';
import { Logger } from 'n8n-workflow';

/**
 * Checks if a message contains a mention to the specified agent using metadata
 */
export function containsMention(data: ChatMessage, agentId: string, logger?: Logger): boolean {
	if (!data || !data.metadata) {
		logger?.debug('MentionFilter: Invalid data', {
			hasData: !!data,
			hasMetadata: !!data?.metadata,
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

	// Check if the specified agentId is in the mentions array
	const hasMention = data.metadata.mentions.some((mention) => mention.id === agentId);

	logger?.debug('MentionFilter: Checking mention using metadata', {
		agentId,
		mentions: data.metadata.mentions,
		hasMention,
	});

	return hasMention;
}

/**
 * Removes mentions from message content using metadata
 *
 * Socket content uses @[[UUID]] format. Removes the agent's mention to produce
 * clean content for the workflow.
 */
export function removeMentionsFromContent(
	content: string,
	data: ChatMessage,
	agentId: string,
): string {
	if (!content || !data?.metadata?.mentions || !agentId) {
		return content;
	}

	const mention = data.metadata.mentions.find((m) => m.id === agentId);

	if (!mention) {
		return content;
	}

	const escapedId = escapeRegex(mention.id);
	const mentionPattern = new RegExp(`@\\[\\[${escapedId}\\]\\]`, 'g');

	return content.replace(mentionPattern, '').replace(/\s+/g, ' ').trim();
}

/**
 * Creates simplified message data for n8n workflow
 */
export function createMessageResponse(data: ChatMessage, agentId: string): N8NMessageResponse {
	// Remove mentions from content
	const contentWithoutMention = removeMentionsFromContent(data.content, data, agentId);

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
