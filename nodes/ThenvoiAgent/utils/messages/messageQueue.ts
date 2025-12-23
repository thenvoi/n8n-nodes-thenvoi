import { sendEventToThenvoi, sendTextMessageToThenvoi } from '@lib/api/messages';
import { HttpClient } from '@lib/http/client';
import { ChatMessageMention, ChatMessageType, isEventType } from '@lib/types';
import { getErrorInfo } from '@lib/utils/errors';
import { Logger } from 'n8n-workflow';

/**
 * Message queue interface for managing sequential message sending
 *
 * Ensures messages are sent to the Thenvoi API in order by maintaining
 * a promise chain. Messages are enqueued immediately but sent sequentially
 * to prevent race conditions and ensure proper ordering.
 *
 * Usage pattern:
 * 1. Create queue with `createMessageQueue()`
 * 2. Enqueue messages with `enqueue()` (non-blocking)
 * 3. Call `wait()` before completion to ensure all messages are sent
 *
 * Example:
 * ```typescript
 * const queue = createMessageQueue(httpClient, logger, chatId);
 * queue.enqueue('text', 'Hello');
 * queue.enqueue('tool_call', 'Calling function');
 * await queue.wait(); // Wait for all messages to be sent
 * ```
 */
export interface MessageQueue {
	/**
	 * Adds a message to the queue for sequential sending
	 *
	 * The message will be sent after all previously enqueued messages
	 * complete. This method returns immediately and does not wait for
	 * the message to be sent.
	 *
	 * @param messageType - Type of message (text, tool_call, tool_result, etc.)
	 * @param content - Message content text
	 * @param mentions - Optional mentions array (required for text messages)
	 * @param metadata - Optional metadata object (for event types)
	 */
	enqueue: (
		messageType: ChatMessageType,
		content: string,
		mentions?: ChatMessageMention[],
		metadata?: Record<string, unknown>,
	) => void;
	/**
	 * Waits for all enqueued messages to be sent
	 *
	 * Returns a promise that resolves when all messages in the queue
	 * have been processed. Should be called before completing execution
	 * to ensure all messages are sent.
	 *
	 * @returns Promise that resolves when queue is empty
	 */
	wait: () => Promise<void>;
	/**
	 * Returns the current number of messages in the queue
	 *
	 * @returns Number of messages that have been enqueued
	 */
	getCount: () => number;
}

/**
 * Sends a message or event based on type
 *
 * Routes to the correct endpoint:
 * - 'text' → /messages (requires mentions)
 * - All others → /events (no mention validation, supports metadata)
 */
async function sendByType(
	httpClient: HttpClient,
	chatId: string,
	messageType: ChatMessageType,
	content: string,
	mentions?: ChatMessageMention[],
	metadata?: Record<string, unknown>,
): Promise<void> {
	if (isEventType(messageType)) {
		await sendEventToThenvoi(httpClient, chatId, messageType, content, metadata);
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
		enqueue: (
			messageType: ChatMessageType,
			content: string,
			mentions?: ChatMessageMention[],
			metadata?: Record<string, unknown>,
		) => {
			count++;
			const messageId = count;

			queue = queue.then(async () => {
				try {
					await sendByType(httpClient, chatId, messageType, content, mentions, metadata);
				} catch (error) {
					const errorInfo = getErrorInfo(error);

					logger.error('Failed to send queued message', {
						messageId,
						messageType,
						error: errorInfo,
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
				const errorInfo = getErrorInfo(error);
				logger.warn('Error while waiting for message queue', {
					error: errorInfo,
				});
			}
		},

		getCount: () => count,
	};
}
