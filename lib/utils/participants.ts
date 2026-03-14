import { ChatParticipant } from '@lib/types';

/**
 * Returns true when a participant has a non-empty handle.
 */
export function hasValidHandle(participant: ChatParticipant): boolean {
	return typeof participant.handle === 'string' && participant.handle.trim().length > 0;
}
