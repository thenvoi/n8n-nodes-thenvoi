import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { BaseMemory } from 'langchain/memory';
import { AgentNodeConfig } from './agentConfig';

/**
 * Agent type based on model capabilities
 */
export type AgentType = 'tool-calling' | 'react';

/**
 * Agent execution context including model, tools, and memory
 */
export interface AgentExecutionContext {
	model: BaseChatModel;
	tools: StructuredTool[];
	memory?: BaseMemory;
	config: AgentNodeConfig;
}

/**
 * Result of agent execution
 */
export interface AgentExecutionResult {
	output: string;
	intermediateSteps?: Array<{
		action: {
			tool: string;
			toolInput: string;
			log: string;
		};
		observation: string;
	}>;
}
