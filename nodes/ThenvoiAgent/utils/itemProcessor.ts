/**
 * Item Processor
 *
 * Processes individual items through the agent execution pipeline.
 * Handles validation, logging, output formatting, and error handling
 * for each item in the node's input batch.
 */

import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { AgentNodeConfig, AgentExecutionResult } from '../types';
import { getAgentConfig } from './config';
import { validateAgentInput } from './validation';
import { runAgent } from '../execution';

/**
 * Validates and retrieves input text from an item
 * Throws NodeOperationError if input is empty or invalid
 */
function getValidatedInput(
	ctx: IExecuteFunctions,
	itemJson: INodeExecutionData['json'],
	index: number,
): string {
	const inputText = validateAgentInput(itemJson);

	if (!inputText || inputText.trim().length === 0) {
		throw new NodeOperationError(ctx.getNode(), 'Agent received empty input', {
			itemIndex: index,
		});
	}

	return inputText;
}

/**
 * Logs the start of agent execution with configuration details
 */
function logExecutionStart(
	ctx: IExecuteFunctions,
	index: number,
	inputText: string,
	config: AgentNodeConfig,
): void {
	ctx.logger.info('Starting agent execution', {
		itemIndex: index,
		chatId: config.chatId,
		inputLength: inputText.length,
		messageTypes: config.messageTypes,
		maxIterations: config.maxIterations,
	});
}

/**
 * Logs successful completion of agent execution
 */
function logExecutionSuccess(
	ctx: IExecuteFunctions,
	index: number,
	result: AgentExecutionResult,
): void {
	ctx.logger.info('Agent execution completed successfully', {
		itemIndex: index,
		outputLength: result.output.length,
		hasIntermediateSteps: !!result.intermediateSteps,
	});
}

/**
 * Creates success output data from agent execution result
 */
function createSuccessOutput(
	inputText: string,
	result: AgentExecutionResult,
	config: AgentNodeConfig,
	index: number,
): INodeExecutionData {
	return {
		json: {
			input: inputText,
			output: result.output,
			chatId: config.chatId,
			...(config.returnIntermediateSteps && result.intermediateSteps
				? { intermediateSteps: result.intermediateSteps }
				: {}),
			metadata: {
				maxIterations: config.maxIterations,
				messageTypes: config.messageTypes,
			},
		},
		pairedItem: { item: index },
	};
}

/**
 * Creates error output data for failed execution
 */
function createErrorOutput(errorMessage: string, index: number): INodeExecutionData {
	return {
		json: {
			error: errorMessage,
			success: false,
		},
		pairedItem: { item: index },
	};
}

/**
 * Handles execution error by logging and either returning error data or throwing
 */
function handleExecutionError(
	ctx: IExecuteFunctions,
	error: Error,
	index: number,
): INodeExecutionData | never {
	const errorMessage = error.message || 'Unknown error occurred';

	ctx.logger.error('Agent execution failed', {
		itemIndex: index,
		error: errorMessage,
	});

	if (ctx.continueOnFail()) {
		return createErrorOutput(errorMessage, index);
	}

	throw new NodeOperationError(ctx.getNode(), `Agent execution failed: ${errorMessage}`, {
		itemIndex: index,
	});
}

/**
 * Processes a single item through the agent execution pipeline
 * Handles validation, execution, output formatting, and error handling
 */
export async function processAgentItem(
	ctx: IExecuteFunctions,
	item: INodeExecutionData,
	credentials: ThenvoiCredentials,
	index: number,
): Promise<INodeExecutionData> {
	try {
		const config = getAgentConfig(ctx, index);
		const inputText = getValidatedInput(ctx, item.json, index);

		logExecutionStart(ctx, index, inputText, config);

		const result = await runAgent(ctx, inputText, config, credentials);

		logExecutionSuccess(ctx, index, result);

		return createSuccessOutput(inputText, result, config, index);
	} catch (error) {
		return handleExecutionError(ctx, error as Error, index);
	}
}
