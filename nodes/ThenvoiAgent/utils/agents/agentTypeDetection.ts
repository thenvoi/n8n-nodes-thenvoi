import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Checks if a model supports tool/function calling
 */
export function supportsToolCalling(model: BaseChatModel): boolean {
	return typeof (model as any).bindTools === 'function';
}

