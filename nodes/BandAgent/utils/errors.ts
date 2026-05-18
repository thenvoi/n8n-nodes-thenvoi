/**
 * Error Utilities
 *
 * Centralized error handling utilities for consistent error message extraction.
 */

import { getErrorMessage } from '@lib/utils/errors';
import { formatToolError } from './toolResult';

/**
 * Formats an error as a JSON string for tool responses
 *
 * Use in catch blocks when a tool's API call or operation fails.
 * Delegates to formatToolError for consistent structured output.
 *
 * @param error - The error that occurred
 * @param operation - Description of the operation that failed (e.g., "fetching agent information")
 * @returns JSON string with success: false and error field
 */
export function formatToolErrorResponse(error: unknown, operation: string): string {
	const errorMessage = getErrorMessage(error);
	return formatToolError(`Error ${operation}: ${errorMessage}`);
}
