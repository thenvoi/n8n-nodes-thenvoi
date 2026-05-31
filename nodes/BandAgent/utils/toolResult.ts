/**
 * Tool Result Utilities
 *
 * Helpers for formatting structured tool results. All tools return JSON strings
 * with a consistent shape: success/error at top level, tool-specific fields flat.
 */

/**
 * Formats a successful tool result as a JSON string
 *
 * Merges success: true with the provided data. Use for validation and API success paths.
 *
 * @param data - Tool-specific success fields (message, participants, etc.)
 * @returns JSON string for tool return value
 */
export function formatToolSuccess(data: Record<string, unknown>): string {
	return JSON.stringify({ success: true, ...data });
}

/**
 * Formats an error tool result as a JSON string
 *
 * Use for validation errors and catch blocks. Optional extra fields (e.g. availableParticipants)
 * are merged for context the LLM may need.
 *
 * @param errorMessage - Human-readable error description
 * @param extra - Optional additional fields for the error response
 * @returns JSON string for tool return value
 */
export function formatToolError(
	errorMessage: string,
	extra?: Record<string, unknown>,
): string {
	return JSON.stringify({ success: false, error: errorMessage, ...extra });
}
