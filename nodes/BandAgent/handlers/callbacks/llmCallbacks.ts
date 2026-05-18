import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { getSafeErrorMessage } from '@lib/utils';
import { CallbackContext } from '../../types/agentCapabilities';
import { ContentBlock, LLMGeneration, LLMGenerationMessage } from '../../types/langchain';

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
 * Returns true when the LLM turn is a tool-calling turn with no text output.
 * In that case, generation.text contains serialized tool call input (e.g. {"input": "..."}),
 * which should not be surfaced as a thought.
 */
function isToolCallingTurn(generation: LLMGeneration): boolean {
	const message = generation.message;
	if (!message) {
		return false;
	}

	const hasTopLevelToolCalls = Array.isArray(message.tool_calls) && message.tool_calls.length > 0;
	const hasKwargsToolCalls =
		Array.isArray(message.additional_kwargs?.tool_calls) &&
		(message.additional_kwargs?.tool_calls?.length ?? 0) > 0;

	return hasTopLevelToolCalls || hasKwargsToolCalls;
}

/**
 * Extracts generated text from LLM generation output.
 * Handles various LLM output formats (tool-calling models, regular models).
 *
 * Exported for reuse in the callback handler to track the last non-empty LLM text.
 */
export function extractGeneratedText(generation: LLMGeneration): string {
	let generatedText = '';

	if (generation.message) {
		const thinking = extractThinkingFromKwargs(generation.message);
		const content = extractContentFromMessage(generation.message);
		generatedText = thinking + content;
	}

	// Only fall back to generation.text when the message has no text content AND it is not	
	// a tool-calling turn. For tool-calling turns, generation.text holds the serialized tool
	// call input (e.g. {"input": "..."}), which must not be surfaced as a thought.
	if (!generatedText && generation.text && !isToolCallingTurn(generation)) {
		generatedText = generation.text;
	}

	return generatedText;
}

/**
 * Enqueues the generated text as an intermediate thought when enabled
 */
async function processModelThought(
	ctx: CallbackContext,
	extractedText: string,
	runId: string,
): Promise<void> {
	if (!extractedText) {
		ctx.executionContext.logger.debug('No text content in LLM output', { runId });
		return;
	}

	ctx.executionContext.logger.debug('LLM turn produced text', {
		runId,
		textLength: extractedText.length,
	});

	if (ctx.options.sendIntermediateThoughts) {
		ctx.messageQueue.enqueue('thought', extractedText);
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
 * Called when the LLM finishes generating a response.
 * Returns the extracted text for the caller to use (e.g. for lastNonEmptyLLMText tracking).
 */
export async function handleLLMEnd(
	ctx: CallbackContext,
	output: LLMResult,
	runId: string,
): Promise<string> {
	ctx.executionContext.logger.info('LLM generation completed', {
		runId,
		hasOutput: !!(output.generations && output.generations.length > 0),
	});

	const generation = output.generations?.[0]?.[0];
	const extractedText = generation ? extractGeneratedText(generation as LLMGeneration) : '';

	if (!ctx.options.collectModelThoughts || !output.generations?.length) {
		return extractedText;
	}

	const generationArray = output.generations[0];
	if (!generationArray || !generationArray.length) {
		return extractedText;
	}

	try {
		await processModelThought(ctx, extractedText, runId);
	} catch (error) {
		ctx.executionContext.logger.warn('Failed to process model thought', {
			runId,
			error: (error as Error).message,
		});
	}
	return extractedText;
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
