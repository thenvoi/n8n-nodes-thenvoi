import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials, ChatMessageType, ChatMessageMention } from '@lib/types';
import { sendMessageToThenvoi } from '@lib/api/messages';
import { getErrorMessage } from '@lib/utils/errors';

/**
 * Message queue interface for managing sequential message sending
 */
export interface MessageQueue {
	enqueue: (messageType: ChatMessageType, content: string, mentions?: ChatMessageMention[]) => void;
	wait: () => Promise<void>;
	getCount: () => number;
}

/**
 * Creates a message queue that ensures messages are sent sequentially
 * Uses closure to maintain state
 */
export function createMessageQueue(
	context: IExecuteFunctions,
	credentials: ThenvoiCredentials,
	chatId: string,
): MessageQueue {
	let queue = Promise.resolve();
	let count = 0;

	return {
		enqueue: (messageType: ChatMessageType, content: string, mentions?: ChatMessageMention[]) => {
			count++;
			const messageId = count;

			queue = queue.then(async () => {
				try {
					await sendMessageToThenvoi(context, credentials, chatId, messageType, content, mentions);
				} catch (error) {
					const errorDetails = getErrorMessage(error);
					const errorStack = error instanceof Error ? error.stack : undefined;

					context.logger.error(
						'Failed to send queued message' +
							JSON.stringify({
								messageId,
								messageType,
								error: errorDetails,
								stack: errorStack,
								// Log the full error object for debugging
								fullError: JSON.stringify(error, null, 2),
							}),
						{
							messageId,
							messageType,
							error: errorDetails,
							stack: errorStack,
							// Log the full error object for debugging
							fullError: JSON.stringify(error, null, 2),
						},
					);
				}
			});
		},

		wait: async () => {
			if (count === 0) {
				return;
			}

			try {
				await queue;
			} catch (error) {
				context.logger.warn('Error while waiting for message queue', {
					error: (error as Error).message,
				});
			}
		},

		getCount: () => count,
	};
}
