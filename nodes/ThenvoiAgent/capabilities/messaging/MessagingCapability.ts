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

import { fetchChatParticipants } from '@lib/api';
import { HttpClient } from '@lib/http/client';
import { ChatParticipant } from '@lib/types';
import { Logger } from 'n8n-workflow';
import { ThenvoiAgentCallbackHandler } from '../../handlers/callbacks/ThenvoiAgentCallbackHandler';
import { SendMessageTool } from '../../tools/SendMessageTool';
import { createCallbackOptions } from '../../utils/config';
import { updateMessageFailedStatus, updateMessageProcessedStatus } from '../../utils/messages';
import { Capability, CapabilityContext, CapabilityPriority, SetupResult } from '../base/Capability';

export class MessagingCapability implements Capability {
	readonly name = 'messaging';
	readonly priority = CapabilityPriority.HIGH;

	private handler: ThenvoiAgentCallbackHandler | null = null;
	private sendTaskUpdates: boolean = false;
	private participants: ChatParticipant[] = [];

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		const handler = this.initializeHandler(ctx);
		this.sendTaskUpdates = ctx.config.messageTypes.includes('task_updates');

		await this.fetchParticipantsForMentions(
			ctx.config.chatId,
			ctx.execution.logger,
			ctx.httpClient,
		);

		if (this.sendTaskUpdates) {
			await handler.sendTaskUpdate(ctx.input, 'in_progress');
		}

		ctx.execution.logger.info('Messaging capability initialized', {
			sendTaskUpdates: this.sendTaskUpdates,
			messageTypes: ctx.config.messageTypes,
			participantsCount: this.participants.length,
			messageId: ctx.messageId,
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
	 * @param httpClient - HTTP client for API requests
	 */
	private async fetchParticipantsForMentions(
		chatId: string,
		logger: Logger,
		httpClient: HttpClient,
	): Promise<void> {
		try {
			this.participants = await fetchChatParticipants(httpClient, chatId);
		} catch (error) {
			// Continue without participants - mentions won't work but messaging will
			logger.warn('Failed to fetch participants for mentions', { error });
			this.participants = [];
		}
	}

	/**
	 * Builds the setup result object with callbacks, tools, and metadata
	 *
	 * Creates the send_message tool and includes it in the setup result.
	 * The tool allows agents to send messages during execution.
	 *
	 * @param handler - The initialized callback handler
	 * @returns Setup result with callbacks, tools, and metadata
	 */
	private buildSetupResult(handler: ThenvoiAgentCallbackHandler): SetupResult {
		const sendMessageTool = new SendMessageTool({
			messageQueue: handler.messageQueue,
			participants: this.participants,
		});

		return {
			tools: [sendMessageTool],
			callbacks: [handler],
			metadata: {
				messagingEnabled: true,
			},
		};
	}

	/**
	 * Handles successful agent execution
	 * Sends final output as thought if thoughts are enabled in message types
	 *
	 * @param ctx - Capability context with execution state
	 * @param output - Agent's final output string
	 */
	async onSuccess(ctx: CapabilityContext, output: string): Promise<void> {
		if (!this.handler) return;

		// Send final output as thought if thoughts are enabled
		const sendThoughts = ctx.config.messageTypes.includes('thoughts');
		if (sendThoughts && output && output.trim().length > 0) {
			await this.handler.sendThought(output);
		}

		if (this.sendTaskUpdates) {
			const toolsUsed = this.handler.getToolsUsed();
			const summary =
				toolsUsed.length > 0
					? `Completed task using: ${toolsUsed.join(', ')}`
					: 'Completed task successfully';

			await this.handler.sendTaskUpdate(ctx.input, 'completed', summary);
		}

		await updateMessageProcessedStatus(
			ctx.httpClient,
			ctx.execution.logger,
			ctx.config.chatId,
			ctx.messageId,
		);
	}

	async onError(ctx: CapabilityContext, error: Error): Promise<void> {
		if (!this.handler) return;

		await this.handler.waitForPendingOperations();

		const errorMessage = error.message || 'Unknown error occurred';

		await this.handler.sendError(errorMessage);

		if (this.sendTaskUpdates) {
			await this.handler.sendTaskUpdate(ctx.input, 'failed', `Error: ${errorMessage}`);
		}

		await updateMessageFailedStatus(
			ctx.httpClient,
			ctx.execution.logger,
			ctx.config.chatId,
			ctx.messageId,
			errorMessage,
		);
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
}
