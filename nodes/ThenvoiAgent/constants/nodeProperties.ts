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
// THOUGHT MODE
// ============================================================================

/**
 * Defines the available thought generation modes.
 * Using `as const` to infer literal types for `value`.
 */
const THOUGHT_MODE_OPTIONS = [
	{
		name: 'Model Generated',
		value: 'model',
		description: 'Let the LLM explicitly state its reasoning (natural, model-dependent)',
	},
	{
		name: 'Synthetic',
		value: 'synthetic',
		description:
			'Automatically generate reasoning messages based on agent actions (fast, consistent)',
	},
] as const;

/**
 * Type representing the value of a thought mode option.
 * Automatically inferred from THOUGHT_MODE_OPTIONS.
 */
export type ThoughtModeValue = (typeof THOUGHT_MODE_OPTIONS)[number]['value'];

/**
 * Interface for a single thought mode option.
 */
export type ThoughtModeOption = INodePropertyOptions;

/**
 * Default thought mode.
 */
export const DEFAULT_THOUGHT_MODE: ThoughtModeValue = 'synthetic';

/**
 * n8n node property for thought mode.
 * Properly typed to avoid casting.
 * Note: Default is empty string because this field is conditionally shown via displayOptions.
 * The actual default value (synthetic) is applied in the config extraction logic.
 */
const THOUGHT_MODE_NODE_PROPERTY: INodeProperties = {
	displayName: 'Thought Mode',
	name: 'thoughtMode',
	type: 'options',
	options: THOUGHT_MODE_OPTIONS.map((opt) => ({
		name: opt.name,
		value: opt.value,
		description: opt.description,
	})),
	required: true,
	default: '',
	description: 'How to generate reasoning/thought messages',
	displayOptions: {
		show: {
			messageTypes: ['thoughts'],
		},
	},
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
	PROMPT: 'prompt',
	MAX_ITERATIONS: 'maxIterations',
	MESSAGE_TYPES: 'messageTypes',
	THOUGHT_MODE: 'thoughtMode',
	OPTIONS: 'options',
} as const;

/**
 * Default values for required parameters.
 */
export const DEFAULT_PARAMETERS = {
	PROMPT: 'You are a helpful AI assistant.',
	MAX_ITERATIONS: 10,
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

const PROMPT_PROPERTY: INodeProperties = {
	displayName: 'Prompt',
	name: NODE_PARAMETER_NAMES.PROMPT,
	type: 'string',
	default: 'You are a helpful AI assistant.',
	typeOptions: {
		rows: 4,
	},
	description: 'The system prompt that defines the agent behavior and instructions',
};

const MAX_ITERATIONS_PROPERTY: INodeProperties = {
	displayName: 'Max Iterations',
	name: NODE_PARAMETER_NAMES.MAX_ITERATIONS,
	type: 'number',
	default: 10,
	description: 'Maximum number of iterations the agent can perform before stopping',
};

export const NODE_PARAMETER_PROPERTIES = [
	CHAT_ID_PROPERTY,
	PROMPT_PROPERTY,
	MAX_ITERATIONS_PROPERTY,
	MESSAGE_TYPES_NODE_PROPERTY,
	THOUGHT_MODE_NODE_PROPERTY,
	OPTIONS_NODE_PROPERTY,
];
