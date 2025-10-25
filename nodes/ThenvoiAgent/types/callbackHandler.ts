import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';

/**
 * Configuration options for the Thenvoi callback handler
 */
export interface CallbackOptions {
	/** Send synthetic thought messages (e.g., "Using X tool") */
	sendSyntheticThoughts: boolean;
	/** Modify system prompt to collect model-generated thoughts */
	collectModelThoughts: boolean;
	/** Send tool call messages */
	sendToolCalls: boolean;
	/** Send tool result messages */
	sendToolResults: boolean;
}

/**
 * Thought generation mode
 */
export type ThoughtMode = 'none' | 'synthetic' | 'model';

/**
 * Context required by the callback handler
 */
export interface CallbackHandlerContext {
	chatId: string;
	credentials: ThenvoiCredentials;
	executionContext: IExecuteFunctions;
	options: CallbackOptions;
}

/**
 * Tool call structure matching LangChain format
 */
export interface ToolCallData {
	function: {
		name: string;
		arguments: Record<string, unknown>;
	};
	id: string;
	type: 'function';
}

/**
 * Metadata for tracking callback context
 */
export interface MessageMetadata {
	runId?: string;
	toolName?: string;
	timestamp: number;
}
