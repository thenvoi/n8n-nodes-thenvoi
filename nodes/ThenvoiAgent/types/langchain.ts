import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { BaseMemory } from 'langchain/memory';
import { AgentExecutor } from 'langchain/agents';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

/**
 * Agent components retrieved from node connections
 */
export interface AgentComponents {
	model: BaseChatModel;
	tools: StructuredTool[];
	memory: BaseMemory | undefined;
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
	additional_kwargs?: {
		thinking?: string;
		reasoning?: string;
		thought?: string;
		tool_calls?: Array<{
			index?: number;
			id?: string;
			type?: string;
			function?: {
				name?: string;
				arguments?: string;
			};
		}>;
		[key: string]: unknown; // Allow other properties
	};
}

/**
 * LLM generation structure
 */
export interface LLMGeneration {
	text?: string;
	message?: LLMGenerationMessage;
	generationInfo?: {
		finish_reason?: string;
		[key: string]: unknown; // Allow other properties
	};
}
