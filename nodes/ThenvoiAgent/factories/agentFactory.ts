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
import { AgentBasicInfo } from '@lib/types';
import { configureMemory } from './memoryConfig';
import { createAgent } from './agentCreation';
import { prepareSystemMessage, augmentPromptWithAgents } from './promptFactory';

/**
 * Prepares the system message with optional model thought augmentation and agent context
 */
function prepareAgentPrompt(
	config: AgentNodeConfig,
	ctx: IExecuteFunctions,
	availableAgents: AgentBasicInfo[],
): string {
	const useModelThoughts =
		config.messageTypes.includes('thoughts') && config.thoughtMode === 'model';

	let systemMessage = prepareSystemMessage(config.prompt, useModelThoughts);

	// Augment with available agents for collaboration
	systemMessage = augmentPromptWithAgents(systemMessage, availableAgents);

	if (useModelThoughts || availableAgents.length > 0) {
		ctx.logger.info('Prompt augmented', {
			originalLength: config.prompt.length,
			augmentedLength: systemMessage.length,
			modelThoughts: useModelThoughts,
			availableAgentsCount: availableAgents.length,
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
		verbose: false,
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
	availableAgents: AgentBasicInfo[] = [],
): Promise<AgentExecutor> {
	try {
		const systemMessage = prepareAgentPrompt(config, ctx, availableAgents);
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
