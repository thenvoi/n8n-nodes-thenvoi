import { IExecuteFunctions } from 'n8n-workflow';
import { Serialized } from '@langchain/core/load/serializable';
import { CallbackOptions } from './callbackHandler';
import { MessageQueue } from '../utils/messages/messageQueue';

/**
 * Registry that maps tool class names to their declared tool names
 * Built from actual tool instances to avoid hardcoded mappings
 */
export type ToolNameRegistry = Map<string, string>;

/**
 * Context passed to callback handler functions
 * Contains all the state and dependencies needed for handling callbacks
 */
export interface CallbackContext {
	executionContext: IExecuteFunctions;
	options: CallbackOptions;
	messageQueue: MessageQueue;
	currentTool: Serialized | null;
	toolsUsed: string[];
	toolNameRegistry?: ToolNameRegistry;
}
