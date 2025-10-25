import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials, ChatMessageType } from '@lib/types';
import { sendMessageToThenvoi } from '@lib/api/messages';

/**
 * Message queue interface for managing sequential message sending
 */
export interface MessageQueue {
	enqueue: (messageType: ChatMessageType, content: string) => void;
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
		enqueue: (messageType: ChatMessageType, content: string) => {
			count++;
			const messageId = count;

			context.logger.debug('Queueing message', {
				messageId,
				messageType,
				contentLength: content?.length || 0,
			});

			queue = queue.then(async () => {
				try {
					context.logger.debug('Sending queued message', {
						messageId,
						messageType,
					});

					await sendMessageToThenvoi(context, credentials, chatId, messageType, content);

					context.logger.debug('Queued message sent successfully', {
						messageId,
						messageType,
					});
				} catch (error) {
					context.logger.error('Failed to send queued message', {
						messageId,
						messageType,
						error: (error as Error).message,
					});
				}
			});
		},

		wait: async () => {
			if (count === 0) {
				context.logger.debug('No queued messages to wait for');
				return;
			}

			context.logger.info('Waiting for message queue to complete', {
				queuedMessages: count,
			});

			try {
				await queue;
				context.logger.info('All queued messages sent');
			} catch (error) {
				context.logger.warn('Error while waiting for message queue', {
					error: (error as Error).message,
				});
			}
		},

		getCount: () => count,
	};
}

