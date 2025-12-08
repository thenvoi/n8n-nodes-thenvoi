import { BaseMessage } from '@langchain/core/messages';
import { ParticipantType } from '@lib/types';
import { AgentExecutionResult } from './agentExecution';

/**
 * Type for a single intermediate step from agent execution
 *
 * Derived from AgentExecutionResult to avoid duplication.
 * Uses NonNullable to handle the optional array, and [number] to get the element type.
 */
export type IntermediateStep = NonNullable<AgentExecutionResult['intermediateSteps']>[number];

/**
 * Structured tool call data for memory storage
 */
export interface StructuredToolCall {
	tool: string;
	input: string | Record<string, unknown>;
	result: string | Record<string, unknown>;
}

/**
 * Structured message data for memory storage
 */
export interface StructuredMessageData {
	thoughts: string;
	toolCalls?: StructuredToolCall[];
	messagesSent?: string[];
}

/**
 * Extended additional_kwargs with sender information
 * This is what gets stored in memory alongside the message
 */
export interface MessageAdditionalKwargs {
	sender_id?: string;
	sender_name?: string;
	sender_type?: ParticipantType;
	thenvoi_structured_data?: StructuredMessageData;
}

/**
 * Container for chat history messages
 * Represents the structure returned by LangChain memory implementations
 */
export interface ChatHistoryContainer {
	messages: BaseMessage[];
}

/**
 * Shape of memory implementations that expose a chatHistory property with messages
 *
 * Note: This is a structural type for accessing chatHistory, not extending BaseChatMemory
 * because the actual chatHistory type in LangChain (BaseChatMessageHistory) has a different
 * internal structure that includes a messages getter.
 */
export interface MemoryWithChatHistory {
	chatHistory?: {
		messages?: BaseMessage[];
	};
}

/**
 * Message with modifiable additional_kwargs
 * Used when enriching messages with sender info or structured data
 */
export interface EnrichableMessage {
	additional_kwargs?: MessageAdditionalKwargs;
}
