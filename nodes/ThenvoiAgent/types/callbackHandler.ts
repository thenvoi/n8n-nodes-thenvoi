import { IExecuteFunctions } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';

/**
 * Configuration options for the Thenvoi callback handler
 */
export interface CallbackOptions {
	/** Modify system prompt to collect model-generated thoughts */
	collectModelThoughts: boolean;
	/** Send tool call messages */
	sendToolCalls: boolean;
	/** Send tool result messages */
	sendToolResults: boolean;
}

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
