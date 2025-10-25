import { Logger } from 'n8n-workflow';
import { BaseMemory } from 'langchain/memory';

/**
 * Logs memory status in a condensed format
 */
export async function logMemoryStatus(
	logger: Logger,
	memory: BaseMemory,
	phase: 'before' | 'after',
): Promise<void> {
	try {
		const variables = await memory.loadMemoryVariables({});
		logger.info(`Memory ${phase} execution`, {
			type: memory.constructor.name,
			hasHistory: !!variables.chat_history || !!variables.history,
			keys: Object.keys(variables),
		});
	} catch (error) {
		logger.warn(`Failed to load memory ${phase} execution`, {
			error: (error as Error).message,
		});
	}
}
