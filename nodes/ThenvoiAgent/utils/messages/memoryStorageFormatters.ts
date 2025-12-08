/**
 * Memory Storage Formatters
 *
 * Utilities for formatting agent execution data (thoughts, tool calls, messages)
 * into structured format for memory storage.
 */

import { IntermediateStep, StructuredToolCall, StructuredMessageData } from '../../types/memory';
import { SEND_MESSAGE_TOOL_ID } from '../../tools/SendMessageTool';

/**
 * Tool input type from intermediate steps
 */
type ToolInput = string | Record<string, unknown>;

/**
 * Checks if a tool name corresponds to the send_message tool
 *
 * @param toolName - Name of the tool to check
 * @returns true if the tool is send_message
 */
function isSendMessageTool(toolName: string): boolean {
	return toolName === SEND_MESSAGE_TOOL_ID || toolName === 'send_message';
}

/**
 * Extracts message content from send_message tool input
 *
 * The send_message tool accepts input in two formats:
 * - String: The message content directly
 * - Object: { input: "message content" }
 *
 * @param input - Tool input (string or object)
 * @returns Extracted message content, or empty string if extraction fails
 */
function extractMessageContent(input: ToolInput): string {
	if (typeof input === 'string') {
		return input;
	}

	if (typeof input === 'object' && input !== null) {
		// send_message always uses { input: "message" } format
		if ('input' in input && typeof input.input === 'string') {
			return input.input;
		}
		// Fallback: stringify unexpected structure
		return JSON.stringify(input);
	}

	return String(input || '');
}

/**
 * Extracts send_message tool calls from intermediate steps
 *
 * Filters steps to find send_message calls and extracts their message content.
 *
 * @param intermediateSteps - Array of intermediate steps from agent execution
 * @returns Array of message contents from send_message tool calls
 */
export function extractSendMessageCalls(intermediateSteps: IntermediateStep[]): string[] {
	return intermediateSteps
		.filter((step) => isSendMessageTool(step.action.tool))
		.map((step) => extractMessageContent(step.action.toolInput))
		.filter((content) => content.length > 0);
}

/**
 * Creates structured message data from thoughts and intermediate steps
 *
 * Separates thoughts, tool calls, and messages sent into structured format
 * for better data preservation and retrieval.
 *
 * @param thoughts - LLM output (agent thoughts/reasoning)
 * @param intermediateSteps - Array of intermediate steps from agent execution
 * @returns Structured message data
 */
export function createStructuredMessageData(
	thoughts: string,
	intermediateSteps: IntermediateStep[],
): StructuredMessageData {
	const structuredData: StructuredMessageData = {
		thoughts: thoughts || '',
	};

	// Extract all tool calls (including send_message)
	const toolCalls: StructuredToolCall[] = intermediateSteps.map((step) => ({
		tool: step.action.tool,
		input: step.action.toolInput,
		result: step.observation,
	}));

	if (toolCalls.length > 0) {
		structuredData.toolCalls = toolCalls;
	}

	// Extract send_message calls
	const sendMessageCalls = extractSendMessageCalls(intermediateSteps);
	if (sendMessageCalls.length > 0) {
		structuredData.messagesSent = sendMessageCalls;
	}

	return structuredData;
}
