import { IExecuteFunctions } from 'n8n-workflow';
import { Serialized } from '@langchain/core/load/serializable';
import { CallbackOptions } from './callbackHandler';
import { MessageQueue } from '../utils/messages/messageQueue';

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
}
