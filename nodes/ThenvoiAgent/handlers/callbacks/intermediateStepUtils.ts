/**
 * Intermediate Step Utilities
 *
 * Helpers for capturing and managing intermediate steps during agent execution.
 * Used by callback handlers to track tool calls and their results.
 */

import { Serialized } from '@langchain/core/load/serializable';
import { ToolNameRegistry } from '../../types/agentCapabilities';
import type { IntermediateStep } from '../../types/memory';
import { extractToolName } from '../../utils/messages/toolFormatters';

/**
 * Tool input can be a string or a parsed JSON object
 */
export type ToolInput = string | Record<string, unknown>;

/**
 * Parses tool input string into appropriate type
 *
 * Attempts to parse JSON; if successful and result is an object, returns parsed object.
 * Otherwise returns the original string.
 *
 * @param input - Raw tool input string
 * @returns Parsed object or original string
 */
export function parseToolInput(input: string): ToolInput {
	try {
		const parsed = JSON.parse(input);
		if (typeof parsed === 'object' && parsed !== null) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		// Not valid JSON, keep as string
	}

	return input;
}

/**
 * Creates an intermediate step from tool execution data
 *
 * @param toolName - Name of the tool that was executed
 * @param toolInput - Input provided to the tool
 * @param observation - Output/result from the tool
 * @returns Intermediate step object
 */
export function createIntermediateStep(
	toolName: string,
	toolInput: ToolInput,
	observation: string,
): IntermediateStep {
	return {
		action: {
			tool: toolName,
			toolInput,
			log: '',
		},
		observation,
	};
}

/**
 * Captures an intermediate step from a completed tool execution
 *
 * Extracts tool name from serialized tool, parses input, and creates the step.
 *
 * @param tool - Serialized tool object from LangChain
 * @param rawInput - Raw input string provided to the tool
 * @param output - Output from the tool execution
 * @param toolNameRegistry - Optional registry for tool name lookup
 * @returns Intermediate step object
 */
export function captureIntermediateStep(
	tool: Serialized,
	rawInput: string,
	output: string,
	toolNameRegistry?: ToolNameRegistry,
): IntermediateStep {
	const toolName = extractToolName(tool, toolNameRegistry);
	const toolInput = parseToolInput(rawInput);

	return createIntermediateStep(toolName, toolInput, output);
}

