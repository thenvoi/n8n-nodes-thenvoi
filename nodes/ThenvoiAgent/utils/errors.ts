/**
 * Error Utilities
 *
 * Centralized error handling utilities for consistent error message extraction.
 */

/**
 * Extracts error message from an error object
 * Returns 'Unknown error' if the error is not an Error instance
 */
export function extractErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown error';
}
