import { Serialized } from '@langchain/core/load/serializable';
import { ToolCallData } from '../../types/callbackHandler';

/**
 * Extracts tool name from LangChain serialized tool
 */
function extractToolName(tool: Serialized): string {
	if (tool.name) {
		return tool.name;
	}

	if (Array.isArray(tool.id)) {
		return tool.id[tool.id.length - 1] || 'unknown';
	}

	return 'unknown';
}

/**
 * Parses tool input string into arguments object
 */
function parseToolInput(input: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(input);
		return typeof parsed === 'object' && parsed !== null ? parsed : { input };
	} catch {
		return { input };
	}
}

/**
 * Formats a tool call into the Thenvoi tool_call message format
 */
export function formatToolCall(tool: Serialized, input: string, runId: string): string {
	const toolName = extractToolName(tool);
	const toolArguments = parseToolInput(input);

	const toolCall: ToolCallData = {
		function: {
			name: toolName,
			arguments: toolArguments,
		},
		id: runId,
		type: 'function',
	};

	return JSON.stringify(toolCall);
}

/**
 * Formats tool output into a string suitable for tool_result message
 * If output is already valid JSON, returns as-is. Otherwise wraps it.
 */
export function formatToolResult(output: string, runId?: string): string {
	try {
		JSON.parse(output);
		return output;
	} catch {
		const result = {
			result: output,
			...(runId && { id: runId }),
		};
		return JSON.stringify(result);
	}
}

/**
 * Summarizes input for display (truncates if too long)
 */
export function summarizeInput(input: string, maxLength: number = 100): string {
	if (input.length <= maxLength) {
		return input;
	}
	return input.substring(0, maxLength) + '...';
}
