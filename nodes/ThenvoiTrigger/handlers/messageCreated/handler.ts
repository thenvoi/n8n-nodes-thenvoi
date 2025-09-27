import { INodeProperties, ITriggerFunctions } from 'n8n-workflow';
import { BaseEventHandler } from '../base/BaseEventHandler';
import { ChatMessage, N8NMessageResponse, RawChatMessage } from '../../types/chatMessage';
import { MessageCreatedConfig } from '../../types/config';
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
		return containsMention(data, config.mentionedUser, config.caseSensitive, context.logger);
	}

	/**
	 * Builds enriched data payload for the workflow
	 */
	buildWorkflowPayload(
		data: ChatMessage,
		config: MessageCreatedConfig,
		context: ITriggerFunctions,
	): N8NMessageResponse {
		return createMessageResponse(data, config.mentionedUser, config.caseSensitive);
	}

	/**
	 * Returns event-specific node parameters
	 */
	getEventSpecificParameters(): INodeProperties[] {
		return [
			{
				displayName: 'Mentioned User',
				name: 'mentionedUser',
				type: 'string',
				default: '',
				required: true,
				description: 'The username to filter for mentions (e.g., "john" for @john mentions)',
				displayOptions: {
					show: {
						event: ['message_created'],
					},
				},
			},
			{
				displayName: 'Case Sensitive',
				name: 'caseSensitive',
				type: 'boolean',
				default: false,
				description: 'Whether the mention matching should be case sensitive',
				displayOptions: {
					show: {
						event: ['message_created'],
					},
				},
			},
		];
	}
}
