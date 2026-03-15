/**
 * Agent Factory
 *
 * Orchestrates the creation of LangChain agents with Thenvoi integration.
 * Handles memory configuration, prompt preparation, and agent executor assembly.
 *
 * Only tool-calling agents are supported. Models without native function calling
 * will receive a clear error at creation time.
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Runnable } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { AgentExecutor } from 'langchain/agents';
import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ThenvoiMemory } from '../memory/ThenvoiMemory';
import { AgentNodeConfig, DynamicPromptContext } from '../types';
import { createAgent } from './agentCreation';
import { getBaseTemplate, injectDynamicContext, injectUserContent } from './promptFactory';
import { configureMemorySenderInfo } from './memoryConfig';
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
	ctx: IExecuteFunctions,
): AgentExecutor {
	const agentExecutor = AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		maxIterations: config.maxIterations,
		returnIntermediateSteps: false, // Collected via callback handler for real-time memory updates
		verbose: false,
		...(memory && {
			memory,
			memoryKey: 'chat_history',
		}),
	});

	ctx.logger.info('Agent executor created', {
		toolCount: tools.length,
		hasMemory: !!memory,
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

		const agent = await createAgent(model, tools, systemMessage, ctx);

		if (memory) {
			configureMemorySenderInfo(memory, config, dynamicContext.participants, ctx.logger);
		}

		return assembleExecutor(agent, tools, memory, config, ctx);
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
