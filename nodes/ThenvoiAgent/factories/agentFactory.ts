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
import { AgentExecutor } from 'langchain/agents';
import { Runnable } from '@langchain/core/runnables';
import { AgentNodeConfig, AgentType, DynamicPromptContext } from '../types';
import { ThenvoiMemory } from '../memory/ThenvoiMemory';
import { createAgent } from './agentCreation';
import { getBaseTemplate, injectUserContent, injectDynamicContext } from './promptFactory';
/**
 * Prepares complete system prompt from template + user content + dynamic context
 */
function prepareAgentPrompt(
	config: AgentNodeConfig,
	ctx: IExecuteFunctions,
	dynamicContext: DynamicPromptContext,
): string {
	// Load base template (cached after first load)
	const baseTemplate = getBaseTemplate();

	// Inject user customization content
	let prompt = injectUserContent(
		baseTemplate,
		config.agentRole,
		config.agentGuidelines,
		config.agentExamples,
	);

	// Inject dynamic context
	prompt = injectDynamicContext(prompt, dynamicContext, config.messageHistorySource);

	ctx.logger.info('System prompt prepared', {
		templateLength: baseTemplate.length,
		finalLength: prompt.length,
		hasGuidelines: !!config.agentGuidelines,
		hasExamples: !!config.agentExamples,
		participantsCount: dynamicContext.participants.length,
		toolsCount: dynamicContext.tools.length,
		historySource: config.messageHistorySource,
		messageCount: dynamicContext.recentMessages.length,
	});

	return prompt;
}

/**
 * Assembles the final agent executor with all components
 */
function assembleExecutor(
	agent: Runnable,
	tools: StructuredTool[],
	memory: ThenvoiMemory | undefined,
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
	memory: ThenvoiMemory | undefined,
	config: AgentNodeConfig,
	dynamicContext: DynamicPromptContext,
): Promise<AgentExecutor> {
	try {
		const systemMessage = prepareAgentPrompt(config, ctx, dynamicContext);

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
