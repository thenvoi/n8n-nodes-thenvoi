import { Logger } from 'n8n-workflow';
import { ChatMessage, N8NMessageResponse, ChatMessageMention } from '../../../types/chatMessage';

/**
 * Checks if a message contains a mention to the specified user using metadata
 */
export function containsMention(
	data: ChatMessage,
	username: string,
	caseSensitive: boolean,
	logger?: Logger,
): boolean {
	if (!data || !data.metadata || !username) {
		logger?.debug('MentionFilter: Invalid data or username', {
			hasData: !!data,
			hasMetadata: !!data?.metadata,
			hasUsername: !!username,
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

	// Check if the specified username is in the mentions array
	const hasMention = data.metadata.mentions.some((mention) =>
		mentionMatches(mention, username, caseSensitive),
	);

	logger?.debug('MentionFilter: Checking mention using metadata', {
		username,
		caseSensitive,
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
	mentionedUser: string,
	caseSensitive: boolean,
): string {
	if (!content || !data?.metadata?.mentions || !mentionedUser) {
		return content;
	}

	// Find the mention in metadata to get the exact username format
	const mention = data.metadata.mentions.find((m) =>
		mentionMatches(m, mentionedUser, caseSensitive),
	);

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
export function createMessageResponse(
	data: ChatMessage,
	mentionedUser: string,
	caseSensitive: boolean,
): N8NMessageResponse {
	// Remove mentions from content
	const contentWithoutMention = removeMentionsFromContent(
		data.content,
		data,
		mentionedUser,
		caseSensitive,
	);

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

/**
 * Helper function to check if a mention matches the target username
 */
function mentionMatches(
	mention: ChatMessageMention,
	targetUsername: string,
	caseSensitive: boolean,
): boolean {
	const mentionUsername = caseSensitive ? mention.username : mention.username.toLowerCase();
	const target = caseSensitive ? targetUsername : targetUsername.toLowerCase();
	return mentionUsername === target;
}
