import { IExecuteFunctions } from 'n8n-workflow';
import { AgentNodeConfig, CallbackOptions } from '../types';
import {
	MessageTypeOptionValue,
	ThoughtModeValue,
	AgentNodeOptions,
	NODE_PARAMETER_NAMES,
	DEFAULT_THOUGHT_MODE,
} from '../constants/nodeProperties';

/**
 * Extracts agent configuration from node parameters
 * All parameters are required except those in the options collection
 */
export function getAgentConfig(ctx: IExecuteFunctions, itemIndex: number): AgentNodeConfig {
	const options = ctx.getNodeParameter(
		NODE_PARAMETER_NAMES.OPTIONS,
		itemIndex,
		{},
	) as AgentNodeOptions;

	const thoughtMode = ctx.getNodeParameter(NODE_PARAMETER_NAMES.THOUGHT_MODE, itemIndex, '') as
		| ThoughtModeValue
		| '';

	return {
		chatId: ctx.getNodeParameter(NODE_PARAMETER_NAMES.CHAT_ID, itemIndex) as string,
		prompt: ctx.getNodeParameter(NODE_PARAMETER_NAMES.PROMPT, itemIndex) as string,
		maxIterations: ctx.getNodeParameter(NODE_PARAMETER_NAMES.MAX_ITERATIONS, itemIndex) as number,
		messageTypes: ctx.getNodeParameter(
			NODE_PARAMETER_NAMES.MESSAGE_TYPES,
			itemIndex,
		) as MessageTypeOptionValue[],
		thoughtMode: thoughtMode || DEFAULT_THOUGHT_MODE,
		returnIntermediateSteps: options.returnIntermediateSteps || false,
	};
}

/**
 * Converts agent configuration to callback handler options
 */
export function createCallbackOptions(config: AgentNodeConfig): CallbackOptions {
	const sendThoughts = config.messageTypes.includes('thoughts');

	return {
		sendSyntheticThoughts: sendThoughts && config.thoughtMode === 'synthetic',
		collectModelThoughts: sendThoughts && config.thoughtMode === 'model',
		sendToolCalls: config.messageTypes.includes('tool_calls'),
		sendToolResults: config.messageTypes.includes('tool_results'),
	};
}
