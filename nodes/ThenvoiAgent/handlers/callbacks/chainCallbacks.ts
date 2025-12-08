import { Serialized } from '@langchain/core/load/serializable';
import { ChainValues } from '@langchain/core/utils/types';
import { CallbackContext } from '../../types/agentCapabilities';

/**
 * Called when a chain starts
 */
export async function handleChainStart(
	context: CallbackContext,
	chain: Serialized,
	inputs: ChainValues,
	runId: string,
): Promise<void> {
	context.executionContext.logger.info('Chain execution started', {
		runId,
		chainName: chain.name || chain.id?.[chain.id.length - 1] || 'unknown',
		inputKeys: Object.keys(inputs),
	});
}

/**
 * Called when a chain ends
 */
export async function handleChainEnd(
	context: CallbackContext,
	outputs: ChainValues,
	runId: string,
): Promise<void> {
	context.executionContext.logger.info('Chain execution completed', {
		runId,
		outputKeys: Object.keys(outputs),
	});
}
