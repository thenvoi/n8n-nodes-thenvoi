/**
 * Messaging Capability
 *
 * Handles sending messages to Thenvoi chat during agent execution.
 * Captures real-time agent activity including task updates, thoughts,
 * tool calls, tool results, and final responses.
 *
 * Detects and processes mentions for all participants (users and agents)
 * that appear in the response text.
 *
 * Priority: HIGH (25) - Runs early to capture all agent events
 */

import { Logger } from 'n8n-workflow';
import { Capability, CapabilityContext, SetupResult, CapabilityPriority } from '../base/Capability';
import { ThenvoiAgentCallbackHandler } from '../../handlers/callbacks/ThenvoiAgentCallbackHandler';
import { createCallbackOptions } from '../../utils/config';
import { createMentionMetadata, detectMentions } from '../../utils/mentions';
import { ChatParticipant, ChatMessageMention } from '@lib/types';
import { HttpClient } from '@lib/http/client';
import { fetchChatParticipants } from '@lib/api';

export class MessagingCapability implements Capability {
	readonly name = 'messaging';
	readonly priority = CapabilityPriority.HIGH;

	private handler: ThenvoiAgentCallbackHandler | null = null;
	private sendTaskUpdates: boolean = false;
	private participants: ChatParticipant[] = [];
	private httpClient: HttpClient | null = null;

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		const handler = this.initializeHandler(ctx);
		this.sendTaskUpdates = ctx.config.messageTypes.includes('task_updates');
		this.httpClient = new HttpClient(ctx.credentials, ctx.execution.logger);

		await this.fetchParticipantsForMentions(ctx.config.chatId, ctx.execution.logger);

		if (this.sendTaskUpdates) {
			await handler.sendTaskUpdate(ctx.input, 'in_progress');
		}

		ctx.execution.logger.info('Messaging capability initialized', {
			sendTaskUpdates: this.sendTaskUpdates,
			messageTypes: ctx.config.messageTypes,
			participantsCount: this.participants.length,
		});

		return this.buildSetupResult(handler);
	}

	/**
	 * Initializes and configures the callback handler for messaging
	 *
	 * Creates the handler with callback options based on node configuration.
	 * The handler manages all real-time message sending to Thenvoi chat.
	 *
	 * @param ctx - Capability context for configuration
	 * @returns Initialized callback handler
	 */
	private initializeHandler(ctx: CapabilityContext): ThenvoiAgentCallbackHandler {
		const callbackOptions = createCallbackOptions(ctx.config);

		this.handler = new ThenvoiAgentCallbackHandler(
			ctx.config.chatId,
			ctx.credentials,
			ctx.execution,
			callbackOptions,
		);

		return this.handler;
	}

	/**
	 * Fetches all participants (users and agents) for mention detection
	 *
	 * If fetching fails, continues without participants - mentions won't work
	 * but messaging functionality remains available.
	 *
	 * @param chatId - ID of the chat to fetch participants from
	 * @param logger - Logger for error reporting
	 */
	private async fetchParticipantsForMentions(chatId: string, logger: Logger): Promise<void> {
		if (!this.httpClient) {
			logger.warn('HTTP client not initialized, cannot fetch participants for mentions');
			return;
		}

		try {
			this.participants = await fetchChatParticipants(this.httpClient, chatId);
		} catch (error) {
			// Continue without participants - mentions won't work but messaging will
			logger.warn('Failed to fetch participants for mentions', { error });
			this.participants = [];
		}
	}

	/**
	 * Builds the setup result object with callbacks and metadata
	 *
	 * @param handler - The initialized callback handler
	 * @returns Setup result with callbacks and metadata
	 */
	private buildSetupResult(handler: ThenvoiAgentCallbackHandler): SetupResult {
		return {
			callbacks: [handler],
			metadata: {
				messagingEnabled: true,
			},
		};
	}

	async onSuccess(ctx: CapabilityContext, output: string): Promise<void> {
		if (!this.handler) return;

		if (output) {
			// Remove thoughts from the final response
			const cleanedOutput = this.removeThoughtsFromOutput(output);
			const { content, mentions } = this.processMentionsInResponse(
				cleanedOutput,
				ctx.credentials.userId,
			);
			await this.handler.sendFinalResponse(content, mentions);
		}

		if (this.sendTaskUpdates) {
			const toolsUsed = this.handler.getToolsUsed();
			const summary =
				toolsUsed.length > 0
					? `Completed task using: ${toolsUsed.join(', ')}`
					: 'Completed task successfully';

			await this.handler.sendTaskUpdate(ctx.input, 'completed', summary);
		}
	}

	/**
	 * Removes model-generated thoughts from the output text
	 *
	 * Removes patterns like "Thinking: ..." and "Reasoning: ..." from the final response
	 * since thoughts are sent separately as thought messages.
	 * Handles both single-line and multi-line thoughts.
	 *
	 * @param output - The agent output that may contain thoughts
	 * @returns The output with thoughts removed
	 */
	private removeThoughtsFromOutput(output: string): string {
		// Remove "Thinking: ..." patterns - matches until newline or end of string
		// This captures the entire thought line including any trailing text on the same line
		let cleaned = output.replace(/Thinking:\s*[^\n]*(?:\n|$)/gi, '');

		// Remove "Reasoning: ..." patterns
		cleaned = cleaned.replace(/Reasoning:\s*[^\n]*(?:\n|$)/gi, '');

		// Remove any standalone "Thinking:" or "Reasoning:" labels that might be left
		cleaned = cleaned.replace(/^(?:Thinking|Reasoning):\s*/gim, '');

		return cleaned;
	}

	async onError(ctx: CapabilityContext, error: Error): Promise<void> {
		if (!this.handler) return;

		await this.handler.waitForPendingOperations();

		if (this.sendTaskUpdates) {
			const errorMessage = error.message || 'Unknown error occurred';
			await this.handler.sendTaskUpdate(ctx.input, 'failed', `Error: ${errorMessage}`);
		}
	}

	async onFinalize(ctx: CapabilityContext): Promise<void> {
		if (this.handler) {
			await this.handler.waitForPendingOperations();
		}
	}

	/**
	 * Adds a participant to the participants list for mention detection
	 *
	 * Used when agents are dynamically added during execution.
	 * Prevents duplicate entries by checking if participant already exists.
	 *
	 * @param participant - The participant to add
	 */
	addParticipant(participant: ChatParticipant): void {
		const exists = this.participants.some((p) => p.id === participant.id);

		if (!exists) {
			this.participants.push(participant);
		}
	}

	/**
	 * Detects mentions in response and creates mention metadata
	 *
	 * Processes the output text to find participant mentions in @Name format,
	 * then creates the metadata structure required for Thenvoi message API.
	 * Returns content unchanged - only adds mention metadata.
	 *
	 * @param output - The response text to process
	 * @param currentAgentId - ID of the current agent (excluded from mentions)
	 * @returns Object with content and optional mention metadata
	 */
	private processMentionsInResponse(
		output: string,
		currentAgentId?: string,
	): { content: string; mentions?: ChatMessageMention[] } {
		if (this.participants.length === 0) {
			return { content: output };
		}

		const participantsToMention = detectMentions(output, this.participants, currentAgentId);

		if (participantsToMention.length > 0) {
			const { content, mentions } = createMentionMetadata(output, participantsToMention);
			return { content, mentions };
		}

		return { content: output };
	}
}
