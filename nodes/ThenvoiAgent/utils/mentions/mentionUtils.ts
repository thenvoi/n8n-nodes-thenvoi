/**
 * Mention Utilities
 *
 * Handles detection of participant mentions in messages and creates mention metadata.
 */

import { ChatMessageMention, ChatParticipant } from '@lib/types';
import { hasValidHandle, includeProperty } from '@lib/utils';
import { escapeRegex } from '@lib/utils/strings';

/**
 * Handles may only contain lowercase letters (a-z), numbers, and hyphen.
 * A mention ends when followed by any other character or end of string.
 * This prevents prefix matching (e.g. @john does not match inside @john-agent).
 */
const MENTION_END_LOOKAHEAD = '(?=[^a-z0-9-]|$)';

/**
 * Detects participants mentioned in a message text using @handle format only.
 * Name is not valid for mentions. Only participants with a handle can be matched.
 * A mention ends at any character that's not valid for handles (lowercase letters, numbers, hyphen).
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
			const pattern = new RegExp(`@${escapedHandle}${MENTION_END_LOOKAHEAD}`);
			return pattern.test(message);
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
