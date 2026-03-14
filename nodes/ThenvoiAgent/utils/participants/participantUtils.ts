import { ChatParticipant } from '@lib/types';

/**
 * Checks if a participant is an agent
 */
export function isAgentParticipant(participant: ChatParticipant): boolean {
	return participant.type === 'Agent';
}

/**
 * Filters participants to return only agents
 */
export function filterAgents(participants: ChatParticipant[]): ChatParticipant[] {
	return participants.filter(isAgentParticipant);
}

/**
 * Looks up a participant's name by ID
 *
 * @param participantId - The participant's ID to look up
 * @param participants - Array of chat participants to search
 * @returns The participant's name or 'Unknown' if not found
 */
export function lookupParticipantName(
	participantId: string,
	participants: ChatParticipant[],
): string {
	const participant = participants.find((p) => p.id === participantId);
	return participant?.name ?? 'Unknown';
}
