import { Logger } from 'n8n-workflow';
import { ErrorInfo, ApiErrorResponse, ThenvoiApiError } from '../types';

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

/**
 * Parses structured error response from API
 *
 * Returns parsed error details or null if response isn't structured error format.
 *
 * @param response - HTTP response object
 * @returns Parsed error details or null if not a structured error
 */
export async function parseApiErrorResponse(
	response: Response,
): Promise<{ message: string; code?: string; details?: Record<string, string[]>; requestId?: string } | null> {
	try {
		const errorData = (await response.json()) as ApiErrorResponse;
		if (errorData.error) {
			return {
				message: errorData.error.message,
				code: errorData.error.code,
				details: errorData.error.details,
				requestId: errorData.error.request_id,
			};
		}
	} catch {
		// Not a structured error response
	}
	return null;
}

/**
 * Creates a ThenvoiApiError from HTTP response
 *
 * Parses structured error response if available, otherwise creates
 * generic error with status code.
 *
 * @param response - HTTP response object
 * @returns ThenvoiApiError instance
 */
export async function createApiError(response: Response): Promise<ThenvoiApiError> {
	const parsedError = await parseApiErrorResponse(response);

	if (parsedError) {
		return new ThenvoiApiError(
			parsedError.message,
			response.status,
			parsedError.code,
			parsedError.details,
			parsedError.requestId,
		);
	}

	// Fallback to generic error
	return new ThenvoiApiError(
		`API request failed: ${response.status} ${response.statusText}`,
		response.status,
	);
}
