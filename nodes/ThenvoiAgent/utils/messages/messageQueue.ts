import { sendEventToThenvoi, sendTextMessageToThenvoi } from '@lib/api/messages';
import { HttpClient } from '@lib/http/client';
import { ChatMessageMention, ChatMessageType, isEventType } from '@lib/types';
import { getErrorMessage } from '@lib/utils/errors';
import { Logger } from 'n8n-workflow';

/**
 * Message queue interface for managing sequential message sending
 */
export interface MessageQueue {
	enqueue: (messageType: ChatMessageType, content: string, mentions?: ChatMessageMention[]) => void;
	wait: () => Promise<void>;
	getCount: () => number;
}

/**
 * Sends a message or event based on type
 *
 * Routes to the correct endpoint:
 * - 'text' → /messages (requires mentions)
 * - All others → /events (no mention validation)
 */
async function sendByType(
	httpClient: HttpClient,
	chatId: string,
	messageType: ChatMessageType,
	content: string,
	mentions?: ChatMessageMention[],
): Promise<void> {
	if (isEventType(messageType)) {
		await sendEventToThenvoi(httpClient, chatId, messageType, content);
	} else {
		await sendTextMessageToThenvoi(httpClient, chatId, content, mentions || []);
	}
}

/**
 * Creates a message queue that ensures messages are sent sequentially
 * Uses closure to maintain state
 */
export function createMessageQueue(
	httpClient: HttpClient,
	logger: Logger,
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
					await sendByType(httpClient, chatId, messageType, content, mentions);
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
