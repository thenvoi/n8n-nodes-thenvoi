import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Defines the available message types that can be streamed to Thenvoi.
 * Using `as const` to infer literal types for `value`.
 */
export const MESSAGE_TYPE_OPTIONS = [
	{
		name: 'Task Updates',
		value: 'task_updates',
		description: 'Send task status updates (in progress, completed, failed)',
	},
	{
		name: 'Thoughts',
		value: 'thoughts',
		description: 'Send reasoning/thought messages during agent execution',
	},
	{
		name: 'Tool Calls',
		value: 'tool_calls',
		description: 'Send messages when tools are invoked',
	},
	{
		name: 'Tool Results',
		value: 'tool_results',
		description: 'Send messages with tool execution results',
	},
] as const;

/**
 * Type representing the value of a message type option.
 * Automatically inferred from MESSAGE_TYPE_OPTIONS.
 */
export type MessageTypeOptionValue = (typeof MESSAGE_TYPE_OPTIONS)[number]['value'];

/**
 * Interface for a single message type option.
 */
export type MessageTypeOption = INodePropertyOptions;

/**
 * Default message types to be enabled in the node.
 */
export const DEFAULT_MESSAGE_TYPES: MessageTypeOptionValue[] = [
	'task_updates',
	'thoughts',
	'tool_calls',
	'tool_results',
];

/**
 * n8n node property for message types
 * Properly typed to avoid casting
 */
export const MESSAGE_TYPES_NODE_PROPERTY: INodeProperties = {
	displayName: 'Message Types to Send',
	name: 'messageTypes',
	type: 'multiOptions',
	options: MESSAGE_TYPE_OPTIONS.map((opt) => ({
		name: opt.name,
		value: opt.value,
		description: opt.description,
	})),
	default: ['task_updates', 'thoughts', 'tool_calls', 'tool_results'],
	description: 'Select which types of messages to stream to Thenvoi during agent execution',
};

// ============================================================================
// OPTIONAL PARAMETERS (OPTIONS COLLECTION)
// ============================================================================

/**
 * Defines the available optional parameters for the agent node.
 */
const OPTIONAL_PARAMETERS: INodeProperties[] = [
	{
		displayName: 'Return Intermediate Steps',
		name: 'returnIntermediateSteps',
		type: 'boolean',
		default: false,
		description: 'Whether to return the agent intermediate steps in the output',
	},
] as const satisfies INodeProperties[];

export interface AgentNodeOptions {
	returnIntermediateSteps?: boolean;
}

/**
 * n8n node property for the options collection.
 * Properly typed to avoid casting.
 */
const OPTIONS_NODE_PROPERTY: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: OPTIONAL_PARAMETERS,
};

// ============================================================================
// CORE REQUIRED PARAMETERS
// ============================================================================

/**
 * Node parameter field names.
 * Centralized to ensure consistency across the codebase.
 */
export const NODE_PARAMETER_NAMES = {
	CHAT_ID: 'chatId',
	AGENT_ROLE: 'agentRole',
	AGENT_GUIDELINES: 'agentGuidelines',
	AGENT_EXAMPLES: 'agentExamples',
	MESSAGE_HISTORY_SOURCE: 'messageHistorySource',
	MESSAGE_HISTORY_LIMIT: 'messageHistoryLimit',
	MAX_ITERATIONS: 'maxIterations',
	MESSAGE_TYPES: 'messageTypes',
	MESSAGE_ID: 'messageId',
	SENDER_ID: 'senderId',
	SENDER_TYPE: 'senderType',
	OPTIONS: 'options',
} as const;

/**
 * Message history source type
 */
export type MessageHistorySource = 'memory' | 'api';

/**
 * Default values for required parameters.
 */
export const DEFAULT_PARAMETERS = {
	MAX_ITERATIONS: 20,
	MESSAGE_HISTORY_LIMIT: 50,
} as const;

/**
 * Node property definitions for core parameters.
 */
const CHAT_ID_PROPERTY: INodeProperties = {
	displayName: 'Chat ID',
	name: NODE_PARAMETER_NAMES.CHAT_ID,
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
	description: 'The ID of the Thenvoi chat room to stream agent activity to',
};

const AGENT_ROLE_PROPERTY: INodeProperties = {
	displayName: 'Agent Role',
	name: NODE_PARAMETER_NAMES.AGENT_ROLE,
	type: 'string',
	default: '',
	required: true,
	typeOptions: {
		rows: 6,
	},
	placeholder: 'You are WeatherBot, a friendly weather information assistant...',
	description: "Define your agent's identity, capabilities, and personality",
};

const AGENT_GUIDELINES_PROPERTY: INodeProperties = {
	displayName: 'Agent Guidelines',
	name: NODE_PARAMETER_NAMES.AGENT_GUIDELINES,
	type: 'string',
	default: '',
	typeOptions: {
		rows: 6,
	},
	placeholder: '- Always provide temperature in Celsius...',
	description: 'Optional: Domain-specific rules and guidelines',
};

const AGENT_EXAMPLES_PROPERTY: INodeProperties = {
	displayName: 'Agent Examples',
	name: NODE_PARAMETER_NAMES.AGENT_EXAMPLES,
	type: 'string',
	default: '',
	typeOptions: {
		rows: 8,
	},
	placeholder: '### Example: Weather Query\n\nUser: @WeatherBot...',
	description: 'Optional: Example interactions showing desired behavior',
};

const MESSAGE_HISTORY_SOURCE_PROPERTY: INodeProperties = {
	displayName: 'Message History Source',
	name: NODE_PARAMETER_NAMES.MESSAGE_HISTORY_SOURCE,
	type: 'options',
	options: [
		{
			name: 'From Memory',
			value: 'memory',
			description: 'Load conversation history from connected memory node',
		},
		{
			name: 'From API',
			value: 'api',
			description: 'Fetch recent messages from Thenvoi API',
		},
	],
	default: 'memory',
	description: 'Where to load conversation history from for context',
};

const MESSAGE_HISTORY_LIMIT_PROPERTY: INodeProperties = {
	displayName: 'Message History Limit',
	name: NODE_PARAMETER_NAMES.MESSAGE_HISTORY_LIMIT,
	type: 'number',
	default: 50,
	description: 'Maximum number of recent messages to load from API',
	displayOptions: {
		show: {
			messageHistorySource: ['api'],
		},
	},
};

const MAX_ITERATIONS_PROPERTY: INodeProperties = {
	displayName: 'Max Iterations',
	name: NODE_PARAMETER_NAMES.MAX_ITERATIONS,
	type: 'number',
	default: 20,
	description: 'Maximum number of iterations the agent can perform before stopping',
};

const MESSAGE_ID_PROPERTY: INodeProperties = {
	displayName: 'Message ID',
	name: NODE_PARAMETER_NAMES.MESSAGE_ID,
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
	description: 'ID of the message to reply to',
};

const SENDER_ID_PROPERTY: INodeProperties = {
	displayName: 'Sender ID',
	name: NODE_PARAMETER_NAMES.SENDER_ID,
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
	description: 'ID of the participant who sent the message (from trigger)',
};

const SENDER_TYPE_PROPERTY: INodeProperties = {
	displayName: 'Sender Type',
	name: NODE_PARAMETER_NAMES.SENDER_TYPE,
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g., User or Agent',
	description: 'Type of the participant who sent the message (from trigger)',
};

export const NODE_PARAMETER_PROPERTIES = [
	CHAT_ID_PROPERTY,
	AGENT_ROLE_PROPERTY,
	AGENT_GUIDELINES_PROPERTY,
	AGENT_EXAMPLES_PROPERTY,
	MESSAGE_HISTORY_SOURCE_PROPERTY,
	MESSAGE_HISTORY_LIMIT_PROPERTY,
	MAX_ITERATIONS_PROPERTY,
	MESSAGE_TYPES_NODE_PROPERTY,
	MESSAGE_ID_PROPERTY,
	SENDER_ID_PROPERTY,
	SENDER_TYPE_PROPERTY,
	OPTIONS_NODE_PROPERTY,
];
