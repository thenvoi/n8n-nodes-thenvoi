import { ITriggerFunctions } from 'n8n-workflow';
import { ChatMessage, N8NMessageResponse, RawChatMessage } from '@lib/types';
import { MessageCreatedConfig } from '../../../types/config';
import { BaseEventHandler } from '../base/BaseEventHandler';
import { containsMention, createMessageResponse } from './utils';

/**
 * Event handler for message_created events
 */
export class MessageCreatedHandler extends BaseEventHandler<
	MessageCreatedConfig,
	RawChatMessage,
	ChatMessage
> {
	readonly eventType = 'message_created';
	readonly displayName = 'Message Created';
	readonly description = 'Triggers when a new message is created with mention filtering';
	protected acceptedMessageTypes = ['text'];

	/**
	 * Determines if the workflow should be triggered based on mention detection
	 * Message type validation is handled by the base class
	 */
	shouldTriggerWorkflow(
		data: ChatMessage,
		config: MessageCreatedConfig,
		context: ITriggerFunctions,
	): boolean {
		// Check for mentions - message type validation is handled by base class
		if (!this.config?.userId) {
			context.logger.error('MessageCreatedHandler: userId not initialized');
			return false;
		}
		return containsMention(data, this.config.userId, context.logger);
	}

	/**
	 * Builds enriched data payload for the workflow
	 */
	buildWorkflowPayload(
		data: ChatMessage,
		config: MessageCreatedConfig,
		context: ITriggerFunctions,
	): N8NMessageResponse {
		if (!this.config?.userId) {
			context.logger.error('MessageCreatedHandler: userId not initialized');
			throw new Error('MessageCreatedHandler: userId not initialized');
		}
		return createMessageResponse(data, this.config.userId);
	}
}
