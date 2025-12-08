import { Serialized } from '@langchain/core/load/serializable';
import { StructuredTool } from '@langchain/core/tools';
import { ToolCallData } from '../../types/callbackHandler';
import { ToolNameRegistry } from '../../types/agentCapabilities';

/**
 * Builds a registry mapping tool class names to their declared tool names
 *
 * Extracts the class name from each tool instance and maps it to the tool's
 * `name` property. This registry is used to look up tool names from
 * serialized tool objects in callbacks.
 *
 * @param tools - Array of tool instances
 * @returns Map from class name to tool name
 */
export function buildToolNameRegistry(tools: StructuredTool[]): ToolNameRegistry {
	const registry = new Map<string, string>();

	for (const tool of tools) {
		// Get the class name from the tool's constructor
		const className = tool.constructor.name;

		// Map class name to the tool's declared name property
		if (tool.name && className) {
			registry.set(className, tool.name);
		}
	}

	return registry;
}

/**
 * Extracts tool name from LangChain serialized tool
 *
 * LangChain serializes tools in different ways depending on the context.
 * This function tries multiple strategies to extract the actual tool name:
 * 1. Direct `name` property on the serialized object
 * 2. Look up class name from `id` in the tool name registry (built from actual tool instances)
 * 3. Fallback to class name if no registry or mapping exists
 *
 * @param tool - The serialized tool object from LangChain callbacks
 * @param toolNameRegistry - Optional registry mapping class names to tool names (built from actual tool instances)
 * @returns The tool name to use
 */
export function extractToolName(tool: Serialized, toolNameRegistry?: ToolNameRegistry): string {
	// Try direct name property first
	if (tool.name) {
		return tool.name;
	}

	// Fallback: Extract class name from id and look up in registry
	if (Array.isArray(tool.id) && tool.id.length > 0) {
		const className = tool.id[tool.id.length - 1];
		if (typeof className === 'string') {
			// Use registry if available (built from actual tool instances)
			if (toolNameRegistry && toolNameRegistry.has(className)) {
				return toolNameRegistry.get(className)!;
			}
			// If no registry or mapping, return the class name (for external tools)
			return className;
		}
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
export function formatToolCall(
	tool: Serialized,
	input: string,
	runId: string,
	toolNameRegistry?: ToolNameRegistry,
): string {
	const toolName = extractToolName(tool, toolNameRegistry);
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
