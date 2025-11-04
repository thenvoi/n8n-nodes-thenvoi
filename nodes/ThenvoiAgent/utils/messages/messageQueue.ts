import { Logger } from 'n8n-workflow';
import { ThenvoiCredentials, ChatMessageType, ChatMessageMention } from '@lib/types';
import { sendMessageToThenvoi } from '@lib/api/messages';
import { getErrorMessage } from '@lib/utils/errors';
import { HttpClient } from '@lib/http/client';

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
	httpClient: HttpClient,
	logger: Logger,
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
					await sendMessageToThenvoi(
						httpClient,
						chatId,
						messageType,
						content,
						credentials.agentId,
						mentions,
					);
				} catch (error) {
					const errorDetails = getErrorMessage(error);
					const errorStack = error instanceof Error ? error.stack : undefined;

					logger.error('Failed to send queued message', {
						messageId,
						messageType,
						error: errorDetails,
						stack: errorStack,
					});
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
				logger.warn('Error while waiting for message queue', {
					error: (error as Error).message,
				});
			}
		},

		getCount: () => count,
	};
}
