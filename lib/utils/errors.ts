import { INode, Logger, NodeOperationError } from 'n8n-workflow';
import { ErrorInfo, ApiErrorResponse, ThenvoiApiError } from '../types';

/**
 * User-facing message for invalid Thenvoi authentication tokens
 */
export const INVALID_AUTH_TOKEN_ERROR_MESSAGE =
	'Invalid Thenvoi auth token (API key). Please verify your Thenvoi credentials.';

const AUTH_ERROR_PATTERN =
	/(unauthorized|forbidden|invalid (api key|api_key|token|credentials)|authentication failed|auth failed)/i;

/**
 * Converts unknown values to readable strings, with JSON fallback for objects.
 */
function stringifyUnknown(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (value === null) {
		return 'null';
	}

	if (value === undefined) {
		return 'undefined';
	}

	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}

	if (typeof value === 'symbol') {
		return value.toString();
	}

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * Returns true if the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Converts any error-like value to a consistent error message string
 */
export function getErrorMessage(error: unknown): string {
	if (isRecord(error) && 'message' in error) {
		return stringifyUnknown(error.message);
	}

	return stringifyUnknown(error);
}

/**
 * Converts any error-like value to a structured error info object for logging
 */
export function getErrorInfo(error: unknown): ErrorInfo {
	if (error instanceof Error) {
		return {
			message: getErrorMessage(error),
			name: error.name,
			stack: error.stack,
		};
	}

	return {
		message: getErrorMessage(error),
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
 * Checks whether an error represents an authentication failure
 */
export function isThenvoiAuthError(error: unknown): boolean {
	if (error instanceof ThenvoiApiError) {
		return error.status === 401 || error.status === 403;
	}

	const errorMessage = getSafeErrorMessage(error);
	return AUTH_ERROR_PATTERN.test(errorMessage);
}

/**
 * Creates the standard node error for invalid Thenvoi authentication.
 */
export function createInvalidAuthTokenNodeError(node: INode): NodeOperationError {
	return new NodeOperationError(node, INVALID_AUTH_TOKEN_ERROR_MESSAGE);
}

/**
 * Parses structured error response from API
 *
 * Returns parsed error details or null if response isn't structured error format.
 *
 * @param response - HTTP response object
 * @returns Parsed error details or null if not a structured error
 */
export async function parseApiErrorResponse(response: Response): Promise<{
	message: string;
	code?: string;
	details?: Record<string, string[]>;
	requestId?: string;
} | null> {
	try {
		const errorData = (await response.json()) as ApiErrorResponse;
		if (errorData.error) {
			const apiMessage =
				isRecord(errorData.error) && 'message' in errorData.error
					? stringifyUnknown(errorData.error.message)
					: 'API request failed';

			return {
				message: apiMessage,
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
