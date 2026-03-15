import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
import { createToolCallingAgent } from 'langchain/agents';
import { Runnable } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { supportsToolCalling } from '../utils/agents/agentTypeDetection';
import { createToolCallingPrompt } from './promptFactory';

/**
 * Creates a tool-calling agent using the model's native function calling
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
 * Creates the agent for the given model and tools.
 *
 * Throws a NodeOperationError if the model does not support tool calling,
 * since only tool-calling agents are supported.
 */
export async function createAgent(
	model: BaseChatModel,
	tools: StructuredTool[],
	systemMessage: string,
	ctx: IExecuteFunctions,
): Promise<Runnable> {
	if (!supportsToolCalling(model)) {
		throw new NodeOperationError(
			ctx.getNode(),
			`The selected model (${model.constructor.name}) does not support tool calling. Please use a model that supports native function calling (e.g. Claude 3+, GPT-4, Gemini).`,
		);
	}

	return await createToolCallingAgentInstance(
		model,
		tools,
		createToolCallingPrompt(systemMessage),
		ctx,
	);
}
