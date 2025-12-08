import { IExecuteFunctions } from 'n8n-workflow';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool, ToolInterface } from '@langchain/core/tools';
import { createToolCallingAgent, createReactAgent } from 'langchain/agents';
import { Runnable } from '@langchain/core/runnables';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { supportsToolCalling } from '../utils/agents/agentTypeDetection';
import { createToolCallingPrompt, createReactPrompt } from './promptFactory';
import { AgentType } from '../types';

/**
 * Agent creation result
 */
export interface AgentCreationResult {
	agent: Runnable;
	agentType: AgentType;
}

/**
 * Detects agent type based on model capabilities
 */
export function detectAgentType(model: BaseChatModel, ctx: IExecuteFunctions): AgentType {
	const hasToolCallingSupport = supportsToolCalling(model);

	ctx.logger.info('Agent type detection', {
		hasToolCallingSupport,
		modelClass: model.constructor.name,
		agentType: hasToolCallingSupport ? 'tool-calling' : 'react',
	});

	return hasToolCallingSupport ? 'tool-calling' : 'react';
}

/**
 * Creates a tool-calling agent (for models with native function calling)
 */
async function createToolCallingAgentInstance(
	model: BaseChatModel,
	tools: StructuredTool[],
	prompt: ChatPromptTemplate,
	ctx: IExecuteFunctions,
): Promise<Runnable> {
	const agent = await createToolCallingAgent({
		llm: model,
		tools,
		prompt,
		streamRunnable: true,
	});

	ctx.logger.info('Created tool-calling agent (native function calling)');
	return agent;
}

/**
 * Creates a ReAct agent (for models without native function calling)
 */
async function createReactAgentInstance(
	model: BaseChatModel,
	tools: StructuredTool[],
	prompt: PromptTemplate,
	ctx: IExecuteFunctions,
): Promise<Runnable> {
	const agent = await createReactAgent({
		llm: model,
		tools: tools as ToolInterface[],
		prompt,
		streamRunnable: true,
	});

	ctx.logger.info('Created ReAct agent (prompt-based fallback)');
	return agent;
}

/**
 * Creates the appropriate agent based on model capabilities
 */
export async function createAgent(
	model: BaseChatModel,
	tools: StructuredTool[],
	systemMessage: string,
	hasMemory: boolean,
	ctx: IExecuteFunctions,
): Promise<AgentCreationResult> {
	const agentType = detectAgentType(model, ctx);

	const agent =
		agentType === 'tool-calling'
			? await createToolCallingAgentInstance(
					model,
					tools,
					createToolCallingPrompt(systemMessage),
					ctx,
				)
			: await createReactAgentInstance(model, tools, createReactPrompt(systemMessage), ctx);

	return { agent, agentType };
}
