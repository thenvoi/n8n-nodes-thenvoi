/**
 * Tool Result Types
 *
 * Structured types for tool return values. All tools use a consistent format:
 * - Success: { success: true, message?: string, ...toolSpecificFields }
 * - Error: { success: false, error: string, ...optionalExtra }
 */

/**
 * Error result from a tool execution
 */
export interface ToolErrorResult {
	success: false;
	error: string;
	[key: string]: unknown;
}

/**
 * Success result from a tool execution
 */
export interface ToolSuccessResult {
	success: true;
	message?: string;
	[key: string]: unknown;
}

/**
 * Union of possible tool result types
 */
export type ToolResult = ToolSuccessResult | ToolErrorResult;
