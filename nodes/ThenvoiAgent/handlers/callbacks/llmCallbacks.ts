import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { getSafeErrorMessage } from '@lib/utils';
import { CallbackContext } from '../../types/agentCapabilities';
import { ContentBlock, LLMGeneration, LLMGenerationMessage } from '../../types/langchain';
import { extractModelThought } from '../../utils/thoughts/thoughtExtraction';

/**
 * Extracts thinking/reasoning from message additional_kwargs
 */
function extractThinkingFromKwargs(message: LLMGenerationMessage): string {
	if (!message.additional_kwargs) {
		return '';
	}

	const kwargs = message.additional_kwargs;
	const thinking = kwargs.thinking || kwargs.reasoning || kwargs.thought;

	return thinking ? `Thinking: ${thinking}\n` : '';
}

/**
 * Extracts text content from message content
 */
function extractContentFromMessage(message: LLMGenerationMessage): string {
	const { content } = message;

	if (typeof content === 'string') {
		return content;
	}

	if (Array.isArray(content)) {
		const textParts = content
			.filter(
				(part: ContentBlock) =>
					part.type === 'text' || part.type === 'thinking' || typeof part === 'string',
			)
			.map((part: any) => {
				if (typeof part === 'string') {
					return part;
				}
				if (part.type === 'thinking' && part.thinking) {
					// Extract thinking from ThinkingContentBlock
					return `Thinking: ${part.thinking}`;
				}
				return part.text || part.content || '';
			})
			.filter((text: string) => text.length > 0);

		return textParts.join('\n');
	}

	return '';
}

/**
 * Extracts generated text from LLM generation output
 * Handles various LLM output formats (tool-calling models, regular models)
 */
function extractGeneratedText(generation: LLMGeneration): string {
	let generatedText = '';

	if (generation.message) {
		const thinking = extractThinkingFromKwargs(generation.message);
		const content = extractContentFromMessage(generation.message);
		generatedText = thinking + content;
	}

	if (!generatedText && generation.text) {
		generatedText = generation.text;
	}

	return generatedText;
}

/**
 * Attempts to extract and send model-generated thought
 */
async function processModelThought(
	ctx: CallbackContext,
	generation: LLMGeneration,
	runId: string,
): Promise<void> {
	const generatedText = extractGeneratedText(generation);

	ctx.executionContext.logger.debug('Attempting to extract model thought', {
		runId,
		hasMessage: !!generation.message,
		hasText: !!generation.text,
		textLength: generatedText.length,
		textPreview: generatedText.substring(0, 200),
	});

	if (!generatedText) {
		ctx.executionContext.logger.debug('No text content in LLM output', { runId });
		return;
	}

	const thought = extractModelThought(generatedText);

	if (thought) {
		ctx.executionContext.logger.info('Extracted model thought', {
			runId,
			thoughtLength: thought.length,
		});
		// TODO: Intermediate thoughts disabled - only final thoughts are sent
		// ctx.messageQueue.enqueue('thought', thought);
	} else {
		ctx.executionContext.logger.debug('No thought pattern found in output', { runId });
	}
}

/**
 * Called when LLM starts generating
 */
export async function handleLLMStart(
	ctx: CallbackContext,
	llm: Serialized,
	prompts: string[],
	runId: string,
): Promise<void> {
	const llmName = llm.name || llm.id?.[llm.id.length - 1] || 'unknown';

	ctx.executionContext.logger.info('LLM generation started', {
		runId,
		llmName,
		promptCount: prompts.length,
	});

	if (ctx.options.collectModelThoughts && prompts.length > 0) {
		ctx.executionContext.logger.debug('LLM prompt (for thought extraction)', {
			runId,
			promptLength: prompts[0]?.length || 0,
		});
	}
}

/**
 * Called when the LLM finishes generating a response
 */
export async function handleLLMEnd(
	ctx: CallbackContext,
	output: LLMResult,
	runId: string,
): Promise<void> {
	ctx.executionContext.logger.info('LLM generation completed', {
		runId,
		hasOutput: !!(output.generations && output.generations.length > 0),
	});

	if (!ctx.options.collectModelThoughts || !output.generations?.length) {
		return;
	}

	const generation = output.generations[0];
	if (!generation || !generation.length) {
		return;
	}

	try {
		await processModelThought(ctx, generation[0] as LLMGeneration, runId);
	} catch (error) {
		ctx.executionContext.logger.warn('Failed to extract model thought', {
			runId,
			error: (error as Error).message,
		});
	}
}

/**
 * Called when an error occurs during LLM execution
 */
export async function handleLLMError(
	ctx: CallbackContext,
	error: Error,
	runId: string,
): Promise<void> {
	const errorMessage = getSafeErrorMessage(error);

	ctx.executionContext.logger.error('LLM execution error', {
		runId,
		error: errorMessage,
	});

	ctx.messageQueue.enqueue('error', errorMessage);
}
