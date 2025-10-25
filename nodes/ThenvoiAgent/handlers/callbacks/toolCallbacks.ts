import { Serialized } from '@langchain/core/load/serializable';
import { CallbackContext } from '../../types/agentCapabilities';
import { formatToolCall, formatToolResult } from '../../utils/messages/toolFormatters';
import {
	generateToolStartThought,
	generateToolEndThought,
	generateErrorThought,
} from '../../utils/thoughts/syntheticThoughts';
import { getSafeErrorMessage } from '@lib/utils';

/**
 * Extracts tool name from serialized tool
 */
function getToolName(tool: Serialized): string {
	return tool.name || tool.id?.[tool.id.length - 1] || 'unknown';
}

/**
 * Sends tool call message to Thenvoi
 */
function sendToolCallMessage(
	ctx: CallbackContext,
	tool: Serialized,
	input: string,
	runId: string,
): void {
	const toolCallContent = formatToolCall(tool, input, runId);
	ctx.executionContext.logger.info('Sending tool call', { runId });
	ctx.messageQueue.enqueue('tool_call', toolCallContent);
}

/**
 * Sends synthetic thought for tool action
 */
function sendSyntheticThoughtForTool(
	ctx: CallbackContext,
	tool: Serialized,
	phase: 'start' | 'end' | 'error',
	runId: string,
	data?: string | Error,
): void {
	let thought: string;

	if (phase === 'start') {
		thought = generateToolStartThought(tool, data as string);
	} else if (phase === 'end') {
		thought = generateToolEndThought(tool, data as string);
	} else {
		thought = generateErrorThought(tool, data as Error);
	}

	ctx.executionContext.logger.info(`Sending synthetic thought for tool ${phase}`, { runId });
	ctx.messageQueue.enqueue('thought', thought);
}

/**
 * Sends tool result message to Thenvoi
 */
function sendToolResultMessage(ctx: CallbackContext, output: string, runId: string): void {
	const toolResultContent = formatToolResult(output, runId);
	ctx.executionContext.logger.info('Sending tool result', { runId });
	ctx.messageQueue.enqueue('tool_result', toolResultContent);
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
	const toolName = getToolName(tool);

	if (!ctx.toolsUsed.includes(toolName)) {
		ctx.toolsUsed.push(toolName);
	}

	ctx.executionContext.logger.info('Tool execution started', {
		toolName,
		runId,
		inputLength: input?.length || 0,
	});

	if (ctx.options.sendSyntheticThoughts) {
		sendSyntheticThoughtForTool(ctx, tool, 'start', runId, input);
	}

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

	if (ctx.options.sendSyntheticThoughts && tool) {
		sendSyntheticThoughtForTool(ctx, tool, 'end', runId, output);
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

	ctx.executionContext.logger.info('Tool execution error', {
		runId,
		toolName: tool ? getToolName(tool) : 'unknown',
		error: errorMessage,
	});

	if (ctx.options.sendSyntheticThoughts && tool) {
		sendSyntheticThoughtForTool(ctx, tool, 'error', runId, error);
	}

	ctx.messageQueue.enqueue('error', errorMessage);
}
