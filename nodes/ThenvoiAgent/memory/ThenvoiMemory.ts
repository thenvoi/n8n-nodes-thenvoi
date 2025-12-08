/**
 * Thenvoi Custom Memory
 *
 * Generic memory wrapper that extends LangChain's BaseChatMemory.
 * Enhances memory storage to include agent thoughts, tool calls, and messages sent.
 *
 * Storage Strategy:
 * - User input: Stored as HumanMessage (standard LangChain format)
 * - Agent response: Stored as AIMessage with:
 *   - content: Raw thoughts only (no formatting) - prevents agent from learning format
 *   - additional_kwargs.thenvoi_structured_data: Structured object containing:
 *     - thoughts: Agent's thoughts/reasoning
 *     - toolCalls: Array of tool calls with tool name, input, and result
 *     - messagesSent: Array of messages sent via send_message tool
 *
 * When loading from memory:
 * - Formatting happens in formatter (formatBaseMessage), not in memory loading
 * - Formatter checks structured data first, falls back to raw content
 * - This ensures agent sees full context (thoughts + tool calls + messages) in RECENT_MESSAGES
 * - Raw thoughts in content prevent agent from learning formatting prefixes
 *
 * Benefits:
 * - Simpler logic: Memory stores raw thoughts, formatter formats when displaying
 * - Full context: Agent sees complete history (thoughts + actions) via RECENT_MESSAGES
 * - No format learning: Raw thoughts prevent agent from replicating formatting
 * - Structured data preserved for future programmatic access
 * - Works with all n8n memory node types
 *
 */

import { BaseChatMemory, BaseChatMemoryInput } from 'langchain/memory';
import { InputValues, OutputValues, MemoryVariables } from 'langchain/memory';
import { SenderInfo } from '@lib/types';
import { findLast } from '@lib/utils';
import {
	IntermediateStep,
	ChatHistoryContainer,
	MemoryWithChatHistory,
	EnrichableMessage,
} from '../types/memory';
import { createStructuredMessageData } from '../utils/messages/memoryStorageFormatters';
import { isHumanMessage, isAIMessage } from '../utils/messages/messageTypeUtils';

export interface ThenvoiMemoryInput extends BaseChatMemoryInput {
	/**
	 * Underlying memory implementation to wrap
	 * Can be any LangChain memory (BufferMemory, WindowMemory, etc.)
	 */
	baseMemory: BaseChatMemory;
}

/**
 * Thenvoi memory class that wraps existing LangChain memory
 *
 * Enhances memory to store complete execution context:
 * - Agent thoughts (LLM output)
 * - Tool calls (structured format)
 * - Messages sent via send_message tool
 *
 * Works with any LangChain memory implementation.
 */
export class ThenvoiMemory extends BaseChatMemory {
	private baseMemory: BaseChatMemory;
	private currentIntermediateSteps: IntermediateStep[] = [];
	private currentSenderInfo?: SenderInfo;

	constructor(fields: ThenvoiMemoryInput) {
		super(fields);
		this.baseMemory = fields.baseMemory;
	}

	get memoryKeys(): string[] {
		return this.baseMemory.memoryKeys;
	}

	/**
	 * Sets intermediate steps for the current execution
	 *
	 * Called before saveContext() is invoked by LangChain.
	 * This allows saveContext() to have access to all tool calls and messages.
	 *
	 * @param steps - Array of intermediate steps from agent execution
	 */
	setIntermediateSteps(steps: IntermediateStep[]): void {
		this.currentIntermediateSteps = steps;
	}

	/**
	 * Sets sender information for the current message
	 *
	 * Called before saveContext to store sender info that will be attached
	 * to the HumanMessage. This allows the formatter to display actual user names.
	 *
	 * @param senderInfo - Sender information (id, name, type)
	 */
	setSenderInfo(senderInfo: SenderInfo): void {
		this.currentSenderInfo = senderInfo;
	}

	/**
	 * Loads memory variables for the current context
	 *
	 * Just delegates to base memory - no formatting needed.
	 * Formatting happens in formatBaseMessage when loading for prompts.
	 */
	async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
		return await this.baseMemory.loadMemoryVariables(values);
	}

	/**
	 * Gets the chat history from base memory if available
	 *
	 * Most LangChain memory implementations expose a chatHistory property
	 * containing the message array. This method safely accesses it.
	 *
	 * @returns Chat history container or null if not available
	 */
	private getChatHistory(): ChatHistoryContainer | null {
		const memoryWithHistory = this.baseMemory as unknown as MemoryWithChatHistory;

		if (!memoryWithHistory.chatHistory?.messages?.length) {
			return null;
		}

		return memoryWithHistory.chatHistory as ChatHistoryContainer;
	}

	/**
	 * Enriches the last HumanMessage with sender information
	 *
	 * Called after saveContext to attach sender metadata to the user's message.
	 * This enables the formatter to display the actual sender name instead of generic "User".
	 *
	 * @param chatHistory - Chat history container with messages array
	 */
	private enrichHumanMessageWithSenderInfo(chatHistory: ChatHistoryContainer): void {
		if (!this.currentSenderInfo) {
			return;
		}

		// Find the last HumanMessage (should be the one we just saved)
		const lastHumanMessage = findLast(chatHistory.messages, (msg) => isHumanMessage(msg));

		if (lastHumanMessage) {
			const enrichable = lastHumanMessage as EnrichableMessage;
			enrichable.additional_kwargs = {
				...enrichable.additional_kwargs,
				sender_id: this.currentSenderInfo.sender_id,
				sender_name: this.currentSenderInfo.sender_name,
				sender_type: this.currentSenderInfo.sender_type,
			};
		}
	}

	/**
	 * Enriches the last AIMessage with structured data
	 *
	 * Called after saveContext to attach execution metadata to the agent's response.
	 * The structured data includes:
	 * - thoughts: Agent's reasoning/output
	 * - toolCalls: Array of tool invocations with inputs and results
	 * - messagesSent: Messages sent via send_message tool
	 *
	 * This data is used by formatters to display full execution context in prompts.
	 *
	 * @param chatHistory - Chat history container with messages array
	 * @param structuredData - Structured execution data to attach
	 */
	private enrichAIMessageWithStructuredData(
		chatHistory: ChatHistoryContainer,
		structuredData: ReturnType<typeof createStructuredMessageData>,
	): void {
		const lastMessage = chatHistory.messages[chatHistory.messages.length - 1];

		if (isAIMessage(lastMessage)) {
			const enrichable = lastMessage as EnrichableMessage;
			enrichable.additional_kwargs = {
				...enrichable.additional_kwargs,
				thenvoi_structured_data: structuredData,
			};
		}
	}

	/**
	 * Saves context (input/output) to memory immediately with structured data
	 *
	 * This method is called by LangChain AgentExecutor once at the end of execution.
	 * It saves the conversation turn with raw thoughts in content (no formatting)
	 * and structured data in additional_kwargs for formatting when displaying.
	 *
	 * @param inputValues - Input values from LangChain (contains user input)
	 * @param outputValues - Output values from LangChain (contains agent thoughts)
	 */
	async saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void> {
		const thoughts = String(outputValues.output || '');
		const structuredData = createStructuredMessageData(thoughts, this.currentIntermediateSteps);

		// Save to base memory with raw thoughts (no formatting)
		// Formatting happens in formatBaseMessage when displaying
		await this.baseMemory.saveContext(inputValues, outputValues);

		const chatHistory = this.getChatHistory();
		if (chatHistory) {
			// Enrich HumanMessage with sender info (allows formatter to show actual user names)
			try {
				this.enrichHumanMessageWithSenderInfo(chatHistory);
			} catch {
				// If enrichment fails, formatter will fall back to "User"
			}

			// Enrich AIMessage with structured data (for full context in prompts)
			try {
				this.enrichAIMessageWithStructuredData(chatHistory, structuredData);
			} catch {
				// If enrichment fails, content has raw thoughts as fallback
			}
		}

		this.currentIntermediateSteps = [];
	}

	/**
	 * Clears all memory
	 */
	async clear(): Promise<void> {
		this.currentIntermediateSteps = [];
		await this.baseMemory.clear();
	}
}
