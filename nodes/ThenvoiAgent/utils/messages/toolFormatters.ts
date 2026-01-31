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
 * Tool call event structure with descriptive content and structured metadata
 */
export interface ToolCallEvent {
	content: string;
	metadata: ToolCallData;
}

/**
 * Tool result event structure with descriptive content and structured metadata
 */
export interface ToolResultEvent {
	content: string;
	metadata: Record<string, unknown>;
}

/**
 * Formats a tool call into the Thenvoi tool_call event format
 *
 * Returns descriptive content text and structured metadata object.
 * Content is human-readable description, metadata contains the actual tool call data.
 *
 * @param tool - Serialized tool object from LangChain
 * @param input - Tool input arguments (JSON string)
 * @param runId - Tool execution run ID
 * @param toolNameRegistry - Optional registry for tool name lookup
 * @returns Object with content (descriptive text) and metadata (tool call data)
 */
export function formatToolCall(
	tool: Serialized,
	input: string,
	runId: string,
	toolNameRegistry?: ToolNameRegistry,
): ToolCallEvent {
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

	return {
		content: `Calling ${toolName}`,
		metadata: toolCall,
	};
}

/**
 * Formats tool output into tool_result event format
 *
 * Returns descriptive content text and structured metadata object.
 * Content is human-readable summary, metadata contains the actual result data.
 *
 * @param output - Tool output (may be JSON string or plain text)
 * @param runId - Optional tool execution run ID
 * @returns Object with content (descriptive text) and metadata (result data)
 */
export function formatToolResult(output: string, runId?: string): ToolResultEvent {
	let resultData: Record<string, unknown>;

	try {
		const parsed = JSON.parse(output);
		resultData = typeof parsed === 'object' && parsed !== null ? parsed : { result: output };
	} catch {
		resultData = {
			result: output,
		};
	}

	if (runId) {
		resultData.id = runId;
	}

	return {
		content: 'Tool execution completed',
		metadata: resultData,
	};
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
