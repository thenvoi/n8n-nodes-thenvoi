import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { ChainValues } from '@langchain/core/utils/types';
import { HttpClient } from '@lib/http/client';
import { ChatMessageMention, ThenvoiCredentials } from '@lib/types';
import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiMemory } from '../../memory/ThenvoiMemory';
import { SEND_MESSAGE_TOOL_ID } from '../../tools/SendMessageTool';
import { CallbackContext, ToolNameRegistry } from '../../types/agentCapabilities';
import { CallbackOptions } from '../../types/callbackHandler';
import { TaskStatus } from '../../types/common';
import type { IntermediateStep } from '../../types/memory';
import { createMessageQueue } from '../../utils/messages/messageQueue';
import { handleChainEnd, handleChainStart } from './chainCallbacks';
import { captureIntermediateStep } from './intermediateStepUtils';
import {
	handleLLMEnd as handleLLMEndCallback,
	handleLLMError,
	handleLLMStart,
} from './llmCallbacks';
import { handleToolEnd, handleToolError, handleToolStart } from './toolCallbacks';

/**
 * LangChain callback handler that sends events to Thenvoi chat in real-time
 * Thin orchestrator that delegates to pure handler functions
 */
export class ThenvoiAgentCallbackHandler extends BaseCallbackHandler {
	/** Handler identifier for LangChain */
	name = 'ThenvoiAgentCallbackHandler';

	// LangChain callback configuration flags
	ignoreLLM = false; // Process LLM generation events
	ignoreChain = false; // Process chain execution events
	ignoreAgent = false; // Process agent action events
	ignoreRetriever = true; // Skip retriever events (not used in this node)

	private ctx: CallbackContext;
	private taskId: string;
	private memory?: ThenvoiMemory;
	private intermediateSteps: IntermediateStep[] = [];
	private currentToolInput: string = '';
	private lastNonEmptyLLMText: string = '';

	constructor(
		chatId: string,
		credentials: ThenvoiCredentials,
		executionContext: IExecuteFunctions,
		options: CallbackOptions,
		memory?: ThenvoiMemory,
	) {
		super();

		this.taskId = this.generateTaskId();
		this.memory = memory;

		const httpClient = new HttpClient(credentials, executionContext.logger);

		this.ctx = {
			executionContext,
			options,
			messageQueue: createMessageQueue(httpClient, executionContext.logger, chatId),
			currentTool: null,
			toolsUsed: [],
		};

		executionContext.logger.info('ThenvoiAgentCallbackHandler initialized', {
			chatId,
			taskId: this.taskId,
			streaming: {
				toolCalls: options.sendToolCalls,
				toolResults: options.sendToolResults,
				modelThoughts: options.collectModelThoughts,
				finalResponse: true,
			},
		});
	}

	async handleLLMStart(llm: Serialized, prompts: string[], runId: string): Promise<void> {
		await handleLLMStart(this.ctx, llm, prompts, runId);
	}

	async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
		const text = await handleLLMEndCallback(this.ctx, output, runId);
		if (text) {
			this.lastNonEmptyLLMText = text;
		}
	}

	/**
	 * Returns the last non-empty text produced by the LLM across all turns.
	 * Used as a fallback thought when the agent's final output is empty.
	 */
	getLastNonEmptyLLMText(): string {
		return this.lastNonEmptyLLMText;
	}

	async handleLLMError(error: Error, runId: string): Promise<void> {
		await handleLLMError(this.ctx, error, runId);
	}

	async handleToolStart(tool: Serialized, input: string, runId: string): Promise<void> {
		this.ctx.currentTool = tool;
		this.currentToolInput = input; // Store input for intermediate steps
		await handleToolStart(this.ctx, tool, input, runId);
	}

	async handleToolEnd(output: string, runId: string): Promise<void> {
		await handleToolEnd(this.ctx, this.ctx.currentTool, output, runId);

		if (this.ctx.currentTool) {
			const step = captureIntermediateStep(
				this.ctx.currentTool,
				this.currentToolInput,
				output,
				this.ctx.toolNameRegistry,
			);
			this.intermediateSteps.push(step);
			this.updateMemoryWithSteps();
		}

		this.ctx.currentTool = null;
		this.currentToolInput = '';
	}

	async handleToolError(error: Error, runId: string): Promise<void> {
		await handleToolError(this.ctx, this.ctx.currentTool, error, runId);
		this.ctx.currentTool = null;
	}

	async handleChainStart(chain: Serialized, inputs: ChainValues, runId: string): Promise<void> {
		await handleChainStart(this.ctx, chain, inputs, runId);
	}

	async handleChainEnd(outputs: ChainValues, runId: string): Promise<void> {
		await handleChainEnd(this.ctx, outputs, runId);
	}

	async handleAgentStart(runId: string, input: string): Promise<void> {
		this.ctx.executionContext.logger.info('Agent execution started', {
			runId,
			inputLength: input?.length || 0,
		});
		// Reset intermediate steps for new execution
		this.intermediateSteps = [];
	}

	/**
	 * Gets the captured intermediate steps
	 * Called by agentExecutor to set them in memory before saveContext
	 */
	getIntermediateSteps(): IntermediateStep[] {
		return this.intermediateSteps;
	}

	/**
	 * Sets the memory instance to update intermediate steps directly
	 */
	setMemory(memory: ThenvoiMemory): void {
		this.memory = memory;
	}

	/**
	 * Updates memory with current intermediate steps if memory is available
	 */
	private updateMemoryWithSteps(): void {
		if (this.memory) {
			this.memory.setIntermediateSteps(this.intermediateSteps);
		}
	}

	getToolsUsed(): string[] {
		return this.ctx.toolsUsed;
	}

	/**
	 * Sets the tool name registry for looking up tool names from serialized tools
	 *
	 * Called after all tools are available to build a registry mapping class names
	 * to their declared tool names.
	 *
	 * @param registry - Registry mapping tool class names to tool names
	 */
	setToolNameRegistry(registry: ToolNameRegistry): void {
		this.ctx.toolNameRegistry = registry;
	}

	/**
	 * Gets the message queue for sending messages
	 *
	 * @returns The message queue instance
	 */
	get messageQueue() {
		return this.ctx.messageQueue;
	}

	async waitForPendingOperations(): Promise<void> {
		await this.ctx.messageQueue.wait();
	}

	/**
	 * Sends agent's final thoughts/reasoning as a thought message
	 */
	async sendThought(thought: string): Promise<void> {
		await this.waitForPendingOperations();
		this.ctx.messageQueue.enqueue('thought', thought);
	}

	async sendFinalResponse(finalAnswer: string, mentions?: ChatMessageMention[]): Promise<void> {
		await this.waitForPendingOperations();

		// Safety check: If send_message tool was used, don't send final response
		// This is a safeguard in case sendFinalResponse is called from somewhere else
		const toolsUsed = this.getToolsUsed();
		if (toolsUsed.includes(SEND_MESSAGE_TOOL_ID)) {
			return;
		}

		// Defensive string conversion for various LangChain output formats
		// Some models return objects/arrays that need normalization
		const answerText = typeof finalAnswer === 'string' ? finalAnswer : String(finalAnswer || '');

		if (!answerText || answerText.trim().length === 0) {
			this.ctx.executionContext.logger.info('No final response to send (empty answer)');
			return;
		}

		this.ctx.executionContext.logger.info('Sending final response', {
			responseLength: answerText.length,
			mentionCount: mentions?.length || 0,
		});

		this.ctx.messageQueue.enqueue('text', answerText, mentions);

		// Wait for the final response to be sent before returning
		await this.waitForPendingOperations();
	}

	async sendTaskUpdate(task: string, status: TaskStatus, summary?: string): Promise<void> {
		const taskMessage = this.formatTaskSummary(task, status, summary);
		this.ctx.messageQueue.enqueue('task', taskMessage);
	}

	/**
	 * Sends an error event to the channel
	 *
	 * Called when agent execution fails so the user sees the error in the chat.
	 */
	async sendError(errorMessage: string): Promise<void> {
		this.ctx.messageQueue.enqueue('error', errorMessage);
	}

	private formatTaskSummary(task: string, status: TaskStatus, summary?: string): string {
		const lines = [`UUID: ${this.taskId}`, `Task: ${task}`, `Status: ${status}`];

		if (summary) {
			lines.push(`Summary: ${summary}`);
		}

		return lines.join('\n');
	}

	private generateTaskId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}
}
