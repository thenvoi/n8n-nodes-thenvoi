import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials, ChatMessageMention } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { CallbackOptions } from '../../types/callbackHandler';
import { CallbackContext } from '../../types/agentCapabilities';
import { TaskStatus } from '../../types/common';
import { createMessageQueue } from '../../utils/messages/messageQueue';
import { handleLLMStart, handleLLMEnd, handleLLMError } from './llmCallbacks';
import { handleToolStart, handleToolEnd, handleToolError } from './toolCallbacks';
import { handleChainStart, handleChainEnd } from './chainCallbacks';
import { SEND_MESSAGE_TOOL_ID } from '../../tools/SendMessageTool';

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

	constructor(
		chatId: string,
		credentials: ThenvoiCredentials,
		executionContext: IExecuteFunctions,
		options: CallbackOptions,
	) {
		super();

		this.taskId = this.generateTaskId();

		const httpClient = new HttpClient(credentials, executionContext.logger);

		this.ctx = {
			executionContext,
			options,
			messageQueue: createMessageQueue(httpClient, executionContext.logger, credentials, chatId),
			currentTool: null,
			toolsUsed: [],
		};

		executionContext.logger.info('ThenvoiAgentCallbackHandler initialized', {
			chatId,
			taskId: this.taskId,
			streaming: {
				toolCalls: options.sendToolCalls,
				toolResults: options.sendToolResults,
				syntheticThoughts: options.sendSyntheticThoughts,
				modelThoughts: options.collectModelThoughts,
				finalResponse: true,
			},
		});
	}

	async handleLLMStart(llm: Serialized, prompts: string[], runId: string): Promise<void> {
		await handleLLMStart(this.ctx, llm, prompts, runId);
	}

	async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
		await handleLLMEnd(this.ctx, output, runId);
	}

	async handleLLMError(error: Error, runId: string): Promise<void> {
		await handleLLMError(this.ctx, error, runId);
	}

	async handleToolStart(tool: Serialized, input: string, runId: string): Promise<void> {
		this.ctx.currentTool = tool;
		await handleToolStart(this.ctx, tool, input, runId);
	}

	async handleToolEnd(output: string, runId: string): Promise<void> {
		await handleToolEnd(this.ctx, this.ctx.currentTool, output, runId);
		this.ctx.currentTool = null;
	}

	async handleToolError(error: Error, runId: string): Promise<void> {
		await handleToolError(this.ctx, this.ctx.currentTool, error, runId);
		this.ctx.currentTool = null;
	}

	async handleChainStart(
		chain: Serialized,
		inputs: Record<string, any>,
		runId: string,
	): Promise<void> {
		await handleChainStart(this.ctx, chain, inputs, runId);
	}

	async handleChainEnd(outputs: Record<string, any>, runId: string): Promise<void> {
		await handleChainEnd(this.ctx, outputs, runId);
	}

	async handleAgentStart(runId: string, input: string): Promise<void> {
		this.ctx.executionContext.logger.info('Agent execution started', {
			runId,
			inputLength: input?.length || 0,
		});
	}

	getToolsUsed(): string[] {
		return this.ctx.toolsUsed;
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

	private formatTaskSummary(task: string, status: TaskStatus, summary?: string): string {
		return `UUID: ${this.taskId}
Task: ${task}
Status: ${status}${summary ? `\nSummary: ${summary}` : ''}`;
	}

	private generateTaskId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}
}
