import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Checks if a model supports tool/function calling
 */
export function supportsToolCalling(model: BaseChatModel): boolean {
	return typeof (model as any).bindTools === 'function';
}

/**
 * Checks if a model is GPT-4o (OpenAI's GPT-4o model)
 * GPT-4o models don't generate thoughts before tool calls in native tool-calling mode,
 * so we may want to force ReAct mode for model-generated thoughts.
 */
export function isGPT4o(model: BaseChatModel): boolean {
	// Check if it's a ChatOpenAI instance
	if (model.constructor.name !== 'ChatOpenAI') {
		return false;
	}

	// Access the model name from the ChatOpenAI instance
	const modelName = (model as any).modelName || (model as any).model;

	if (typeof modelName === 'string') {
		// Check if model name starts with "gpt-4o" (handles variations like "gpt-4o", "gpt-4o-2024-08-06", etc.)
		return modelName.toLowerCase().startsWith('gpt-4o');
	}

	return false;
}
