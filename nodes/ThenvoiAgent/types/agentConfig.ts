import { MessageTypeOptionValue, ThoughtModeValue } from '../constants/nodeProperties';

/**
 * Configuration extracted from node parameters
 */
export interface AgentNodeConfig {
	chatId: string;
	prompt: string;
	maxIterations: number;
	messageTypes: MessageTypeOptionValue[];
	thoughtMode: ThoughtModeValue;
	messageId: string;
	returnIntermediateSteps: boolean;
}

/**
 * Input data for agent execution
 */
export interface AgentInput {
	input: string;
	[key: string]: unknown;
}
