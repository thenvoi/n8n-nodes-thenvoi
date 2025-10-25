/**
 * Messaging Capability
 *
 * Handles sending messages to Thenvoi chat during agent execution.
 * Captures real-time agent activity including task updates, thoughts,
 * tool calls, tool results, and final responses.
 *
 * Priority: HIGH (25) - Runs early to capture all agent events
 */

import { Capability, CapabilityContext, SetupResult, CapabilityPriority } from '../base/Capability';
import { ThenvoiAgentCallbackHandler } from '../../handlers/callbacks/ThenvoiAgentCallbackHandler';
import { createCallbackOptions } from '../../utils/config';

export class MessagingCapability implements Capability {
	readonly name = 'messaging';
	readonly priority = CapabilityPriority.HIGH;

	private handler: ThenvoiAgentCallbackHandler | null = null;
	private sendTaskUpdates: boolean = false;

	async onSetup(ctx: CapabilityContext): Promise<SetupResult> {
		const callbackOptions = createCallbackOptions(ctx.config);

		this.handler = new ThenvoiAgentCallbackHandler(
			ctx.config.chatId,
			ctx.credentials,
			ctx.context,
			callbackOptions,
		);

		this.sendTaskUpdates = ctx.config.messageTypes.includes('task_updates');

		if (this.sendTaskUpdates) {
			await this.handler.sendTaskUpdate(ctx.input, 'in_progress');
		}

		ctx.context.logger.info('Messaging capability initialized', {
			sendTaskUpdates: this.sendTaskUpdates,
			messageTypes: ctx.config.messageTypes,
		});

		return {
			callbacks: [this.handler],
			metadata: {
				messagingEnabled: true,
			},
		};
	}

	async onSuccess(ctx: CapabilityContext, output: string): Promise<void> {
		if (!this.handler) return;

		if (output) {
			await this.handler.sendFinalResponse(output);
		}

		if (this.sendTaskUpdates) {
			const toolsUsed = this.handler.getToolsUsed();
			const summary =
				toolsUsed.length > 0
					? `Completed task using: ${toolsUsed.join(', ')}`
					: 'Completed task successfully';

			await this.handler.sendTaskUpdate(ctx.input, 'completed', summary);
		}

		ctx.context.logger.info('Messaging capability: Success notifications sent');
	}

	async onError(ctx: CapabilityContext, error: Error): Promise<void> {
		if (!this.handler) return;

		await this.handler.waitForPendingOperations();

		if (this.sendTaskUpdates) {
			const errorMessage = error.message || 'Unknown error occurred';
			await this.handler.sendTaskUpdate(ctx.input, 'failed', `Error: ${errorMessage}`);
		}

		ctx.context.logger.info('Messaging capability: Error notifications sent');
	}

	async onFinalize(ctx: CapabilityContext): Promise<void> {
		if (this.handler) {
			await this.handler.waitForPendingOperations();
		}

		ctx.context.logger.info('Messaging capability finalized');
	}
}
