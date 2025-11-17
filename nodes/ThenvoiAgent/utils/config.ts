import { IExecuteFunctions } from 'n8n-workflow';
import { AgentNodeConfig, CallbackOptions } from '../types';
import {
	MessageTypeOptionValue,
	MessageHistorySource,
	AgentNodeOptions,
	NODE_PARAMETER_NAMES,
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

	return {
		chatId: ctx.getNodeParameter(NODE_PARAMETER_NAMES.CHAT_ID, itemIndex) as string,
		agentRole: ctx.getNodeParameter(NODE_PARAMETER_NAMES.AGENT_ROLE, itemIndex) as string,
		agentGuidelines:
			(ctx.getNodeParameter(NODE_PARAMETER_NAMES.AGENT_GUIDELINES, itemIndex, '') as string) ||
			undefined,
		agentExamples:
			(ctx.getNodeParameter(NODE_PARAMETER_NAMES.AGENT_EXAMPLES, itemIndex, '') as string) ||
			undefined,
		messageHistorySource: ctx.getNodeParameter(
			NODE_PARAMETER_NAMES.MESSAGE_HISTORY_SOURCE,
			itemIndex,
			'memory',
		) as MessageHistorySource,
		messageHistoryLimit: ctx.getNodeParameter(
			NODE_PARAMETER_NAMES.MESSAGE_HISTORY_LIMIT,
			itemIndex,
			50,
		) as number,
		maxIterations: ctx.getNodeParameter(NODE_PARAMETER_NAMES.MAX_ITERATIONS, itemIndex) as number,
		messageTypes: ctx.getNodeParameter(
			NODE_PARAMETER_NAMES.MESSAGE_TYPES,
			itemIndex,
		) as MessageTypeOptionValue[],
		messageId: ctx.getNodeParameter(NODE_PARAMETER_NAMES.MESSAGE_ID, itemIndex) as string,
		returnIntermediateSteps: options.returnIntermediateSteps || false,
	};
}

/**
 * Converts agent configuration to callback handler options
 */
export function createCallbackOptions(config: AgentNodeConfig): CallbackOptions {
	return {
		collectModelThoughts: config.messageTypes.includes('thoughts'),
		sendToolCalls: config.messageTypes.includes('tool_calls'),
		sendToolResults: config.messageTypes.includes('tool_results'),
	};
}
