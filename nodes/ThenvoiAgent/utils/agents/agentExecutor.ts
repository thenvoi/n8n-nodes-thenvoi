import { AgentExecutor } from 'langchain/agents';
import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiAgentCallbackHandler } from '../../handlers/callbacks/ThenvoiAgentCallbackHandler';
import { ThenvoiMemory } from '../../memory/ThenvoiMemory';
import { AgentExecutionResult, IntermediateStep } from '../../types';
import { AgentOutput, CallbackHandlers } from '../../types/langchain';
import { logMemoryStatus } from '../logging';
import { normalizeAgentOutput } from './outputNormalizer';

/**
 * Invokes the agent with input and callbacks
 */
async function invokeAgent(
	executor: AgentExecutor,
	input: string,
	callbacks: CallbackHandlers,
): Promise<{ output: unknown }> {
	const invokeOptions = { input };
	const result = await executor.invoke(invokeOptions, callbacks.length > 0 ? { callbacks } : {});
	return result as { output: unknown };
}

/**
 * Extracts intermediate steps from callback handler
 *
 * The callback handler collects intermediate steps during execution and updates
 * memory in real-time. This function retrieves the final collected steps for
 * returning in the execution result (for node output if user enabled the option).
 */
function getIntermediateStepsFromCallbacks(callbacks: CallbackHandlers): IntermediateStep[] {
	for (const callback of callbacks) {
		if (callback instanceof ThenvoiAgentCallbackHandler) {
			return callback.getIntermediateSteps();
		}
	}
	return [];
}

/**
 * Executes the agent with the given input
 *
 * Handles memory logging before/after execution and normalizes the output.
 *
 * Intermediate steps are collected via ThenvoiAgentCallbackHandler which:
 * - Updates memory in real-time as each tool completes
 * - Provides collected steps for node output (if user enabled the option)
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

		const normalizedOutput = normalizeAgentOutput(result.output as AgentOutput, ctx);

		ctx.logger.debug('Agent output normalized', {
			originalType: typeof result.output,
			isArray: Array.isArray(result.output),
			normalizedLength: normalizedOutput.length,
		});

		// Get intermediate steps from callback handler
		// Note: Memory is already updated in real-time by callback's handleToolEnd()
		// This ensures final state is set before LangChain calls saveContext()
		const intermediateSteps = getIntermediateStepsFromCallbacks(callbacks);

		if (memory instanceof ThenvoiMemory) {
			ctx.logger.debug('Final intermediate steps for memory', {
				intermediateStepsCount: intermediateSteps.length,
			});
			memory.setIntermediateSteps(intermediateSteps);
		}

		if (memory) {
			await logMemoryStatus(ctx.logger, memory, 'after');
		}

		return {
			output: normalizedOutput,
			intermediateSteps: intermediateSteps.length > 0 ? intermediateSteps : undefined,
		};
	} catch (error) {
		throw new Error(`Agent execution failed: ${(error as Error).message}`);
	}
}
