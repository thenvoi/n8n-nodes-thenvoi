/**
 * Mention Utilities
 *
 * Handles detection of participant mentions in messages and creates mention metadata.
 */

import { ChatMessageMention, ChatParticipant } from '@lib/types';
import { includeProperty } from '@lib/utils';
import { escapeRegex } from '@lib/utils/strings';

/**
 * Characters that mark the end of a mention (punctuation followed by whitespace or end)
 */
const MENTION_ENDING_PUNCTUATION = '!.,;:?';

/**
 * Detects participants mentioned in a message text using @handle format only.
 * Name is not valid for mentions. Only participants with a handle can be matched.
 * Handles can contain /, ., - (e.g., john.doe/weather-agent).
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
		.filter(hasValidHandle)
		.filter((participant) => !currentAgentId || participant.id !== currentAgentId)
		.filter((participant) => {
			const handle = participant.handle.trim();
			const escapedHandle = escapeRegex(handle);
			// Match @handle followed by: punctuation, whitespace, word boundary, or end of string
			const pattern = `@${escapedHandle}(?=[${MENTION_ENDING_PUNCTUATION}\\s]|\\b|$)`;
			const atMentionPattern = new RegExp(pattern);
			return atMentionPattern.test(message);
		});
}

/**
 * Creates mention metadata for participants mentioned in the content.
 * Handle is required - only participants with handle are included.
 * Content is returned unchanged - only mention metadata is created.
 */
export function createMentionMetadata(
	content: string,
	participantsToMention: ChatParticipant[],
): { content: string; mentions: ChatMessageMention[] } {
	const participantsWithHandle = participantsToMention.filter(hasValidHandle);

	if (participantsWithHandle.length === 0) {
		return { content, mentions: [] };
	}

	const mentions: ChatMessageMention[] = participantsWithHandle.map((participant) => ({
		id: participant.id,
		handle: participant.handle,
		...includeProperty('name', participant.name),
	}));

	return {
		content,
		mentions,
	};
}

export function hasValidHandle(participant: ChatParticipant): boolean {
	return typeof participant.handle === 'string' && participant.handle.trim().length > 0;
}
