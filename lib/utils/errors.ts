import { Logger } from 'n8n-workflow';
import { ErrorInfo } from '../types';

/**
 * Converts any error-like value to a consistent error message string
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

/**
 * Converts any error-like value to a structured error info object for logging
 */
export function getErrorInfo(error: unknown): ErrorInfo {
	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: error.stack,
		};
	}

	return {
		message: String(error),
	};
}

/**
 * Logs an error with consistent formatting
 */
export function logError(
	logger: Logger,
	message: string,
	error: unknown,
	context?: Record<string, unknown>,
): void {
	const errorInfo = getErrorInfo(error);
	logger.error(message, {
		...context,
		error: errorInfo,
	});
}

/**
 * Creates a new Error with a consistent message format
 */
export function createError(message: string, originalError?: unknown): Error {
	const errorMessage = originalError ? `${message}: ${getErrorMessage(originalError)}` : message;

	return new Error(errorMessage);
}

/**
 * Safely extracts error message for user-facing error messages
 */
export function getSafeErrorMessage(error: unknown): string {
	try {
		return getErrorMessage(error);
	} catch {
		return 'An unknown error occurred';
	}
}
