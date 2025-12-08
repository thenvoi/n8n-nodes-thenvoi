/**
 * Message Type Utilities
 *
 * Utilities for checking LangChain message types.
 *
 * LangChain messages can be:
 * - Direct instances (e.g., new AIMessage())
 * - Deserialized objects from storage (lose instanceof checks)
 *
 * These checks handle both by checking instanceof, getType(), and constructor.name.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';

/**
 * Checks if a message is an AIMessage
 *
 * @param msg - The message to check
 * @returns true if the message is an AIMessage
 */
export function isAIMessage(msg: unknown): boolean {
	if (!msg || typeof msg !== 'object') {
		return false;
	}

	// Check instanceof for direct instances
	if (msg instanceof AIMessage) {
		return true;
	}

	// Check getType() method for objects that have it
	const msgWithGetType = msg as { getType?: () => string };
	if (typeof msgWithGetType.getType === 'function' && msgWithGetType.getType() === 'ai') {
		return true;
	}

	// Check constructor name for deserialized objects
	const msgWithConstructor = msg as { constructor?: { name?: string } };
	return msgWithConstructor.constructor?.name === 'AIMessage';
}

/**
 * Checks if a message is a HumanMessage
 *
 * @param msg - The message to check
 * @returns true if the message is a HumanMessage
 */
export function isHumanMessage(msg: unknown): boolean {
	if (!msg || typeof msg !== 'object') {
		return false;
	}

	// Check instanceof for direct instances
	if (msg instanceof HumanMessage) {
		return true;
	}

	// Check getType() method for objects that have it
	const msgWithGetType = msg as { getType?: () => string };
	if (typeof msgWithGetType.getType === 'function' && msgWithGetType.getType() === 'human') {
		return true;
	}

	// Check constructor name for deserialized objects
	const msgWithConstructor = msg as { constructor?: { name?: string } };
	return msgWithConstructor.constructor?.name === 'HumanMessage';
}
