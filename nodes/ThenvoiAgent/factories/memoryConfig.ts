import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { BaseMemory, BaseChatMemory } from 'langchain/memory';
import { ThenvoiMemory } from '../memory/ThenvoiMemory';
import { MessageHistorySource } from '../constants/nodeProperties';
import { getConnectedMemory } from '../utils/nodeConnections';

/**
 * Configures base memory (inputKey/outputKey) and wraps with ThenvoiMemory
 *
 * LangChain memory requires explicit key configuration:
 * - inputKey: field name for storing user input
 * - outputKey: field name for storing agent output
 *
 * The configured memory is then wrapped with ThenvoiMemory for future extensibility.
 */
export function configureMemory(
	memory: BaseMemory | undefined,
	ctx: IExecuteFunctions,
): ThenvoiMemory | undefined {
	if (!memory) {
		ctx.logger.info('No memory connected');
		return undefined;
	}

	// Configure base memory first (critical for LangChain compatibility)
	if ('inputKey' in memory && !(memory as any).inputKey) {
		(memory as any).inputKey = 'input';
	}

	if ('outputKey' in memory && !(memory as any).outputKey) {
		(memory as any).outputKey = 'output';
	}

	// Wrap configured memory with ThenvoiMemory
	const thenvoiMemory = new ThenvoiMemory({
		baseMemory: memory as BaseChatMemory,
	});

	ctx.logger.info('Memory configured and wrapped', {
		memoryType: memory.constructor.name,
		memoryKeys: thenvoiMemory.memoryKeys,
	});

	return thenvoiMemory;
}

/**
 * Fetches and validates connected memory node
 * Throws error if memory is required but not connected
 */
async function getAndValidateMemory(
	execution: IExecuteFunctions,
	required: boolean,
): Promise<BaseMemory | undefined> {
	const memory = await getConnectedMemory(execution);

	if (required && !memory) {
		throw new NodeOperationError(
			execution.getNode(),
			'Message history source is set to "From Memory" but no memory node is connected. Please connect a memory node or change history source to "From API".',
		);
	}

	return memory;
}

/**
 * Sets up memory based on message history source configuration
 * Validates that memory is connected if required
 */
export async function setupMemory(
	execution: IExecuteFunctions,
	messageHistorySource: MessageHistorySource,
): Promise<ThenvoiMemory | undefined> {
	const required = messageHistorySource === 'memory';
	const rawMemory = await getAndValidateMemory(execution, required);

	return rawMemory ? configureMemory(rawMemory, execution) : undefined;
}
