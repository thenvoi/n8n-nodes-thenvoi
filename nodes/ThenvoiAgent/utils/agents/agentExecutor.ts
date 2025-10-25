import { IExecuteFunctions } from 'n8n-workflow';
import { AgentExecutor } from 'langchain/agents';
import { AgentExecutionResult } from '../../types';
import { CallbackHandlers } from '../../types/langchain';
import { normalizeAgentOutput } from './outputNormalizer';
import { logMemoryStatus } from '../logging';

/**
 * Invokes the agent with input and callbacks
 */
async function invokeAgent(
	executor: AgentExecutor,
	input: string,
	callbacks: CallbackHandlers,
): Promise<any> {
	const invokeOptions = { input };
	return await executor.invoke(invokeOptions, callbacks.length > 0 ? { callbacks } : {});
}

/**
 * Executes the agent with the given input
 *
 * Handles memory logging before/after execution and normalizes the output
 */
export async function executeAgent(
	agentExecutor: AgentExecutor,
	input: string,
	callbacks: CallbackHandlers,
	ctx: IExecuteFunctions,
): Promise<AgentExecutionResult> {
	try {
		const memory = agentExecutor.memory;

		if (memory) {
			await logMemoryStatus(ctx.logger, memory, 'before');
		} else {
			ctx.logger.info('No memory configured for this agent');
		}

		const result = await invokeAgent(agentExecutor, input, callbacks);

		if (memory) {
			await logMemoryStatus(ctx.logger, memory, 'after');
		}

		const normalizedOutput = normalizeAgentOutput(result.output as any, ctx);

		ctx.logger.debug('Agent output normalized', {
			originalType: typeof result.output,
			isArray: Array.isArray(result.output),
			normalizedLength: normalizedOutput.length,
		});

		return {
			output: normalizedOutput,
			intermediateSteps: result.intermediateSteps as any,
		};
	} catch (error) {
		throw new Error(`Agent execution failed: ${(error as Error).message}`);
	}
}
