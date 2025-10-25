import { IExecuteFunctions } from 'n8n-workflow';
import { BaseMemory } from 'langchain/memory';

/**
 * Configures memory with appropriate input/output keys
 *
 * LangChain memory requires explicit key configuration:
 * - inputKey: field name for storing user input
 * - outputKey: field name for storing agent output
 *
 * Without these keys, memory won't work correctly with the agent executor
 */
export function configureMemory(memory: BaseMemory | undefined, ctx: IExecuteFunctions): void {
	if (!memory) return;

	// Set inputKey if not already configured
	if ('inputKey' in memory && !(memory as any).inputKey) {
		(memory as any).inputKey = 'input';
	}

	// Set outputKey if not already configured
	if ('outputKey' in memory && !(memory as any).outputKey) {
		(memory as any).outputKey = 'output';
	}

	ctx.logger.info('Memory configured', {
		memoryType: memory.constructor.name,
	});
}
