import { ChatParticipant, AgentBasicInfo } from '@lib/types';

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
 * Creates a ChatParticipant from AgentBasicInfo
 */
export function createAgentParticipantObject(agent: AgentBasicInfo): ChatParticipant {
	return {
		id: agent.id,
		name: agent.name,
		type: 'Agent',
		avatar_url: null,
	};
}
