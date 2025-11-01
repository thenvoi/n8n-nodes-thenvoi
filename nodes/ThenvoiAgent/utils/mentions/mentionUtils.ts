/**
 * Mention Utilities
 *
 * Handles detection of participant mentions in messages and creates mention metadata.
 */

import { ChatMessageMention, ChatParticipant } from '@lib/types';
import { escapeRegex } from '@lib/utils/strings';

/**
 * Characters that mark the end of a mention (punctuation followed by whitespace or end)
 */
const MENTION_ENDING_PUNCTUATION = '!.,;:?';

/**
 * Detects participants mentioned in a message text using @Name format.
 * The AI is responsible for adding @ mentions in the text - this only detects them.
 * Matching is case-sensitive.
 */
export function detectMentions(
	message: string,
	participants: ChatParticipant[],
	currentAgentId?: string,
): ChatParticipant[] {
	if (!message || participants.length === 0) {
		return [];
	}

	return participants
		.filter((participant) => !!participant.name)
		.filter((participant) => !currentAgentId || participant.id !== currentAgentId)
		.filter((participant) => {
			// Trim whitespace from participant name to handle any edge cases
			const trimmedName = participant.name.trim();
			if (!trimmedName) {
				return false;
			}

			const escapedName = escapeRegex(trimmedName);
			// Match @Name followed by:
			// - Punctuation (MENTION_ENDING_PUNCTUATION)
			// - Whitespace (space, tab, newline)
			// - Word boundary (for names ending with word characters)
			// - End of string
			// This handles cases like "@Treasure Hunter!", "@Treasure Hunter hello", "@Name.", etc.
			// Using positive lookahead to ensure the mention is followed by valid characters
			// Matching is case-sensitive as documented
			const pattern = `@${escapedName}(?=[${MENTION_ENDING_PUNCTUATION}\\s]|\\b|$)`;
			const atMentionPattern = new RegExp(pattern);

			return atMentionPattern.test(message);
		});
}

/**
 * Creates mention metadata for participants mentioned in the content.
 * Content is returned unchanged - only mention metadata is created.
 */
export function createMentionMetadata(
	content: string,
	participantsToMention: ChatParticipant[],
): { content: string; mentions: ChatMessageMention[] } {
	if (participantsToMention.length === 0) {
		return { content, mentions: [] };
	}

	const mentions: ChatMessageMention[] = participantsToMention.map((participant) => ({
		id: participant.id,
		username: participant.name,
	}));

	return {
		content,
		mentions,
	};
}
