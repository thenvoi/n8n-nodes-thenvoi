import { Logger } from 'n8n-workflow';
import { HttpClient } from '@lib/http/client';
import { markMessageAsProcessing, markMessageAsProcessed, markMessageAsFailed } from '@lib/api';

/**
 * Common error handling for message processing status updates
 * Wraps API calls with try-catch and logs errors without throwing
 */
async function withErrorHandling<T>(
	logger: Logger,
	operation: string,
	messageId: string,
	apiCall: () => Promise<T>,
): Promise<void> {
	try {
		await apiCall();
	} catch (error) {
		// Log error but continue - message processing status is optional
		logger.warn(`Failed to ${operation}`, {
			messageId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Marks a message as being processed by a participant
 *
 * Creates a new processing attempt immediately when the agent receives the prompt.
 * This is called as early as possible to minimize latency.
 *
 * @param httpClient - HTTP client for API requests
 * @param logger - Logger for error reporting
 * @param chatId - ID of the chat room
 * @param messageId - ID of the message to mark as processing
 */
export async function updateMessageProcessingStatus(
	httpClient: HttpClient,
	logger: Logger,
	chatId: string,
	messageId: string,
): Promise<void> {
	await withErrorHandling(logger, 'mark message as processing', messageId, () =>
		markMessageAsProcessing(httpClient, chatId, messageId),
	);
}

/**
 * Marks a message as successfully processed by a participant
 *
 * Completes the current processing attempt with a system-managed timestamp.
 * This endpoint requires an active processing attempt. If no processing attempt exists, it will return a 422 error.
 *
 * @param httpClient - HTTP client for API requests
 * @param logger - Logger for error reporting
 * @param chatId - ID of the chat room
 * @param messageId - ID of the message to mark as processed
 */
export async function updateMessageProcessedStatus(
	httpClient: HttpClient,
	logger: Logger,
	chatId: string,
	messageId: string,
): Promise<void> {
	await withErrorHandling(logger, 'mark message as processed', messageId, () =>
		markMessageAsProcessed(httpClient, chatId, messageId),
	);
}

/**
 * Marks message processing as failed
 *
 * Completes the current processing attempt by setting it to failed status with an error message.
 * This endpoint requires an active processing attempt. If no processing attempt exists, it will return a 422 error.
 *
 * @param httpClient - HTTP client for API requests
 * @param logger - Logger for error reporting
 * @param chatId - ID of the chat room
 * @param messageId - ID of the message to mark as failed
 * @param errorMessage - Error message describing why processing failed
 */
export async function updateMessageFailedStatus(
	httpClient: HttpClient,
	logger: Logger,
	chatId: string,
	messageId: string,
	errorMessage: string,
): Promise<void> {
	await withErrorHandling(logger, 'mark message as failed', messageId, () =>
		markMessageAsFailed(httpClient, chatId, messageId, errorMessage),
	);
}
