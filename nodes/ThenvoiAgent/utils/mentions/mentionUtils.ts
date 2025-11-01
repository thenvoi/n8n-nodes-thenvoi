/**
 * Mention Utilities
 *
 * Handles detection of participant mentions in messages and creates mention metadata.
 */

import { ChatMessageMention, ChatParticipant } from '@lib/types';
import { escapeRegex } from '@lib/utils/strings';

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
		.filter((participant) => !currentAgentId || participant.id !== currentAgentId)
		.filter((participant) => {
			const escapedName = escapeRegex(participant.name);
			const atMentionPattern = new RegExp(`@${escapedName}(?:\\b|$)`);
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
