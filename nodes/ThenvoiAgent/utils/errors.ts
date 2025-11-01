/**
 * Error Utilities
 *
 * Centralized error handling utilities for consistent error message extraction.
 */

import { getErrorMessage } from '@lib/utils/errors';

/**
 * Formats an error as a JSON string for tool responses
 * Combines error formatting and JSON stringification for consistent tool error responses
 *
 * @param error - The error that occurred
 * @param operation - Description of the operation that failed (e.g., "fetching agent information")
 * @returns JSON string with error field
 */
export function formatToolErrorResponse(error: unknown, operation: string): string {
	const errorMessage = getErrorMessage(error);

	return JSON.stringify({
		error: `Error ${operation}: ${errorMessage}`,
	});
}
