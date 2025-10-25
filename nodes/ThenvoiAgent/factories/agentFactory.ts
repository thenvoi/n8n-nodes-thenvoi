/**
 * Agent Factory
 *
 * Orchestrates the creation of LangChain agents with Thenvoi integration.
 * Handles agent type detection, memory configuration, prompt preparation,
 * and agent executor assembly.
 *
 * Supports two agent types:
 * - Tool-calling agents: For models with native function calling (OpenAI, Claude 3+, Gemini)
 * - ReAct agents: Prompt-based fallback for models without function calling
 */

import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { BaseMemory } from 'langchain/memory';
import { AgentExecutor } from 'langchain/agents';
import { Runnable } from '@langchain/core/runnables';
import { AgentNodeConfig, AgentType } from '../types';
import { configureMemory } from './memoryConfig';
import { createAgent } from './agentCreation';
import { prepareSystemMessage } from './promptFactory';

/**
 * Prepares the system message with optional model thought augmentation
 */
function prepareAgentPrompt(config: AgentNodeConfig, ctx: IExecuteFunctions): string {
	const useModelThoughts =
		config.messageTypes.includes('thoughts') && config.thoughtMode === 'model';

	const systemMessage = prepareSystemMessage(config.prompt, useModelThoughts);

	if (useModelThoughts) {
		ctx.logger.info('Model thoughts enabled', {
			originalLength: config.prompt.length,
			augmentedLength: systemMessage.length,
		});
	}

	return systemMessage;
}

/**
 * Assembles the final agent executor with all components
 */
function assembleExecutor(
	agent: Runnable,
	tools: StructuredTool[],
	memory: BaseMemory | undefined,
	config: AgentNodeConfig,
	agentType: AgentType,
	ctx: IExecuteFunctions,
): AgentExecutor {
	const agentExecutor = AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		maxIterations: config.maxIterations,
		returnIntermediateSteps: config.returnIntermediateSteps,
		verbose: true,
		...(memory && {
			memory,
			memoryKey: 'chat_history',
		}),
	});

	ctx.logger.info('Agent executor created', {
		toolCount: tools.length,
		hasMemory: !!memory,
		agentType,
	});

	return agentExecutor;
}

/**
 * Creates and configures the agent executor
 * Orchestrates the entire agent creation pipeline
 */
export async function createAgentExecutor(
	ctx: IExecuteFunctions,
	model: BaseChatModel,
	tools: StructuredTool[],
	memory: BaseMemory | undefined,
	config: AgentNodeConfig,
): Promise<AgentExecutor> {
	try {
		const systemMessage = prepareAgentPrompt(config, ctx);
		configureMemory(memory, ctx);

		const hasMemory = !!memory;
		const { agent, agentType } = await createAgent(model, tools, systemMessage, hasMemory, ctx);

		return assembleExecutor(agent, tools, memory, config, agentType, ctx);
	} catch (error) {
		ctx.logger.error('Failed to create agent executor', {
			error: (error as Error).message,
			stack: (error as Error).stack,
		});

		throw new NodeOperationError(
			ctx.getNode(),
			`Failed to initialize agent: ${(error as Error).message}`,
		);
	}
}
