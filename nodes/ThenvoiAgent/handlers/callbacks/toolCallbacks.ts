import { Serialized } from '@langchain/core/load/serializable';
import { CallbackContext } from '../../types/agentCapabilities';
import {
	formatToolCall,
	formatToolResult,
	extractToolName,
} from '../../utils/messages/toolFormatters';
import { getSafeErrorMessage } from '@lib/utils';
import type { ToolErrorResult } from '../../types';

/**
 * Sends tool call message to Thenvoi
 */
function sendToolCallMessage(
	ctx: CallbackContext,
	tool: Serialized,
	input: string,
	runId: string,
): void {
	const toolCallEvent = formatToolCall(tool, input, runId, ctx.toolNameRegistry);
	ctx.executionContext.logger.debug('Enqueuing tool call message', { runId });
	ctx.messageQueue.enqueue('tool_call', toolCallEvent.content, undefined, toolCallEvent.metadata);
}

/**
 * Extracts error message from tool output if the tool returned error JSON
 *
 * Tools use structured format: { success: false, error: string }
 */
function extractToolOutputError(output: string): string | null {
	try {
		const parsed = JSON.parse(output) as ToolErrorResult;
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			parsed.success === false &&
			typeof parsed.error === 'string'
		) {
			return parsed.error.trim() || null;
		}
	} catch {
		// Not JSON or parse failed - no structured error
	}
	return null;
}

/**
 * Sends tool result message to Thenvoi
 *
 * When the tool returns error JSON (e.g. send_message validation failure),
 * also sends an error event so the user sees it in the channel.
 */
function sendToolResultMessage(ctx: CallbackContext, output: string, runId: string): void {
	const toolResultEvent = formatToolResult(output, runId);
	ctx.executionContext.logger.debug('Enqueuing tool result message', { runId });
	ctx.messageQueue.enqueue(
		'tool_result',
		toolResultEvent.content,
		undefined,
		toolResultEvent.metadata,
	);

	const errorMessage = extractToolOutputError(output);
	if (errorMessage) {
		ctx.messageQueue.enqueue('error', errorMessage);
	}
}

/**
 * Called when a tool starts executing
 */
export async function handleToolStart(
	ctx: CallbackContext,
	tool: Serialized,
	input: string,
	runId: string,
): Promise<void> {
	const toolName = extractToolName(tool, ctx.toolNameRegistry);
	if (!ctx.toolsUsed.includes(toolName)) {
		ctx.toolsUsed.push(toolName);
	}

	ctx.executionContext.logger.info('Tool execution started', {
		toolName,
		runId,
		inputLength: input?.length || 0,
	});

	if (ctx.options.sendToolCalls) {
		sendToolCallMessage(ctx, tool, input, runId);
	}
}

/**
 * Called when a tool finishes executing
 */
export async function handleToolEnd(
	ctx: CallbackContext,
	tool: Serialized | null,
	output: string,
	runId: string,
): Promise<void> {
	ctx.executionContext.logger.info('Tool execution completed', {
		runId,
		outputLength: output?.length || 0,
	});

	if (ctx.options.sendToolResults) {
		sendToolResultMessage(ctx, output, runId);
	}
}

/**
 * Called when a tool execution fails
 */
export async function handleToolError(
	ctx: CallbackContext,
	tool: Serialized | null,
	error: Error,
	runId: string,
): Promise<void> {
	const errorMessage = getSafeErrorMessage(error);

	ctx.executionContext.logger.error('Tool execution error', {
		runId,
		toolName: tool ? extractToolName(tool, ctx.toolNameRegistry) : 'unknown',
		error: errorMessage,
	});

	ctx.messageQueue.enqueue('error', errorMessage);
}
