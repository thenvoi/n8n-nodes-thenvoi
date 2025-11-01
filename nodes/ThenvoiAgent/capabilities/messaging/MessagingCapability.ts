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

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		const handler = this.initializeHandler(ctx);
		this.sendTaskUpdates = ctx.config.messageTypes.includes('task_updates');

		await this.fetchParticipantsForMentions(ctx);

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
	 * Fetches participants asynchronously and handles errors gracefully.
	 * If fetching fails, continues without participants - mentions won't work
	 * but messaging functionality remains available.
	 *
	 * @param ctx - Capability context for HTTP client and logging
	 */
	private async fetchParticipantsForMentions(ctx: CapabilityContext): Promise<void> {
		try {
			const httpClient = new HttpClient(ctx.credentials, ctx.execution.logger);
			this.participants = await fetchChatParticipants(httpClient, ctx.config.chatId);
		} catch (error) {
			ctx.execution.logger.warn('Failed to fetch participants for mentions', { error });
			// Continue without participants - mentions won't work but messaging will
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
			const { content, mentions } = this.processMentionsInResponse(output, ctx.credentials.userId);
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
