/**
 * Thenvoi Custom Memory
 *
 * Generic memory wrapper that extends LangChain's BaseChatMemory.
 * Currently delegates all operations to the base memory but provides
 * extension points for future customization:
 * - Store tool call metadata
 * - Store mention information
 * - Track conversation participants
 * - Store execution metadata
 *
 */

import { BaseChatMemory, BaseChatMemoryInput } from 'langchain/memory';
import { InputValues, OutputValues, MemoryVariables } from 'langchain/memory';

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
 * Currently delegates all operations to base memory.
 * Future extensions can intercept these operations to add custom behavior.
 */
export class ThenvoiMemory extends BaseChatMemory {
	private baseMemory: BaseChatMemory;

	constructor(fields: ThenvoiMemoryInput) {
		super(fields);
		this.baseMemory = fields.baseMemory;
	}

	get memoryKeys(): string[] {
		return this.baseMemory.memoryKeys;
	}

	/**
	 * Loads memory variables for the current context
	 *
	 * Extension point: Can augment loaded messages with additional context
	 * (e.g., tool calls, mentions) in the future.
	 */
	async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
		return await this.baseMemory.loadMemoryVariables(values);
	}

	/**
	 * Saves context (input/output) to memory
	 *
	 * Extension point: Can store additional metadata alongside messages
	 * (e.g., tool calls, execution stats) in the future.
	 */
	async saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void> {
		await this.baseMemory.saveContext(inputValues, outputValues);
	}

	/**
	 * Clears all memory
	 */
	async clear(): Promise<void> {
		await this.baseMemory.clear();
	}
}
