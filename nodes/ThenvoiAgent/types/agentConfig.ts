import { MessageTypeOptionValue, MessageHistorySource } from '../constants/nodeProperties';
import { ChatParticipant, RoomInfo, ChatMessage } from '@lib/types';
import { StructuredTool } from '@langchain/core/tools';
import { BaseMessage } from '@langchain/core/messages';

/**
 * Configuration extracted from node parameters
 */
export interface AgentNodeConfig {
	chatId: string;
	agentRole: string;
	agentGuidelines?: string;
	agentExamples?: string;
	messageHistorySource: MessageHistorySource;
	messageHistoryLimit: number;
	maxIterations: number;
	messageTypes: MessageTypeOptionValue[];
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

/**
 * Dynamic context injected into prompts at runtime
 *
 * recentMessages can be either:
 * - BaseMessage[] (from memory) - LangChain message format
 * - ChatMessage[] (from API) - Thenvoi API message format
 *
 * The appropriate formatter is used based on messageHistorySource.
 */
export interface DynamicPromptContext {
	roomInfo: RoomInfo;
	participants: ChatParticipant[];
	recentMessages: BaseMessage[] | ChatMessage[];
	tools: StructuredTool[];
}
