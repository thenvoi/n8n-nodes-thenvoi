import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { AgentExecutor } from 'langchain/agents';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { ThenvoiMemory } from '../memory/ThenvoiMemory';

/**
 * Agent components retrieved from node connections
 */
export interface AgentComponents {
	model: BaseChatModel;
	tools: StructuredTool[];
	memory: ThenvoiMemory | undefined;
	executor: AgentExecutor;
}

/**
 * Array of LangChain callback handlers
 */
export type CallbackHandlers = BaseCallbackHandler[];

/**
 * LLM generation content block types
 */
export interface TextContentBlock {
	type: 'text';
	text: string;
}

export interface ToolUseContentBlock {
	type: 'tool_use';
	id?: string;
	name?: string;
	input?: unknown;
}

export interface ThinkingContentBlock {
	type: 'thinking';
	thinking?: string;
}

export type ContentBlock = TextContentBlock | ToolUseContentBlock | ThinkingContentBlock;

/**
 * Agent output can be a string or array of content blocks
 */
export type AgentOutput = string | ContentBlock[];

/**
 * LLM generation message structure
 */
export interface LLMGenerationMessage {
	content: string | ContentBlock[];
	tool_calls?: unknown[];
	additional_kwargs?: {
		thinking?: string;
		reasoning?: string;
		thought?: string;
		tool_calls?: unknown[];
	};
}

/**
 * LLM generation structure
 */
export interface LLMGeneration {
	text?: string;
	message?: LLMGenerationMessage;
}
