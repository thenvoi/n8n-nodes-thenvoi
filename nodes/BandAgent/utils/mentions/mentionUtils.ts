/**
 * Mention Utilities
 *
 * Handles detection of participant mentions in messages and creates mention metadata.
 */

import { ChatMessageMention, ChatParticipant } from '@lib/types';
import { hasValidHandle, includeProperty } from '@lib/utils';
import { escapeRegex } from '@lib/utils/strings';

/**
 * Handles may contain lowercase letters (a-z), numbers, hyphen, dot (middle only), and slash.
 * Agent handles use owner/slug format (e.g. john.doe/weather-assistant).
 * A mention ends when followed by any character not valid for handles or end of string.
 * Including / and . in the valid continuation set prevents @john.doe from matching inside
 * @john.doe/weather-assistant or @john.doe.smith (longer handles).
 */
const MENTION_END_LOOKAHEAD = '(?=[^a-z0-9-/.]|$)';

/**
 * Detects participants mentioned in a message text using @handle format only.
 * Name is not valid for mentions. Only participants with a handle can be matched.
 * Agent handles (owner/slug) are matched in full; user handles are not matched when
 * they are a prefix of an agent handle (e.g. @john.doe does not match in @john.doe/weather-assistant).
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
