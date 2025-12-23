import { Serialized } from '@langchain/core/load/serializable';
import { CallbackContext } from '../../types/agentCapabilities';
import {
	formatToolCall,
	formatToolResult,
	extractToolName,
} from '../../utils/messages/toolFormatters';
import { getSafeErrorMessage } from '@lib/utils';

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
 * Sends tool result message to Thenvoi
 */
function sendToolResultMessage(ctx: CallbackContext, output: string, runId: string): void {
	const toolResultEvent = formatToolResult(output, runId);
	ctx.executionContext.logger.debug('Enqueuing tool result message', { runId });
	ctx.messageQueue.enqueue('tool_result', toolResultEvent.content, undefined, toolResultEvent.metadata);
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
