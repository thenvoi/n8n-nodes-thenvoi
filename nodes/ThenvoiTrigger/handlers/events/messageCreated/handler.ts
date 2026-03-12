import { ChatMessage, N8NMessageResponse, RawChatMessage } from '@lib/types';
import { ITriggerFunctions } from 'n8n-workflow';
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
		return containsMention(data, config.agentId, context.logger);
	}

	/**
	 * Builds enriched data payload for the workflow
	 */
	buildWorkflowPayload(
		data: ChatMessage,
		config: MessageCreatedConfig,
		context: ITriggerFunctions,
	): N8NMessageResponse {
		return createMessageResponse(data, config.agentId);
	}

	parseEventData(rawData: RawChatMessage, context: ITriggerFunctions): ChatMessage {
		return super.parseEventData(rawData, context) as ChatMessage;
	}
}
