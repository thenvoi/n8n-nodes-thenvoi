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
 * Handles various content formats from different LLM providers
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
					// Extract thinking from ThinkingContentBlock (Claude extended thinking)
					return `Thinking: ${part.thinking}`;
				}
				// Handle text blocks - check multiple possible properties
				// Some models might use different property names
				return part.text || part.content || part.message || '';
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
	// Comprehensive logging to debug GPT-4o output structure
	const debugInfo: Record<string, any> = {
		runId,
		hasMessage: !!generation.message,
		hasText: !!generation.text,
		generationKeys: Object.keys(generation),
	};

	if (generation.message) {
		debugInfo.messageKeys = Object.keys(generation.message);
		debugInfo.messageContentType = typeof generation.message.content;
		debugInfo.messageContentIsArray = Array.isArray(generation.message.content);

		if (typeof generation.message.content === 'string') {
			debugInfo.messageContentString = generation.message.content;
		} else if (Array.isArray(generation.message.content)) {
			debugInfo.messageContentArrayLength = generation.message.content.length;
			debugInfo.messageContentArrayItems = generation.message.content.map(
				(item: any, idx: number) => ({
					index: idx,
					type: typeof item,
					isString: typeof item === 'string',
					itemType: item?.type,
					keys: typeof item === 'object' && item !== null ? Object.keys(item) : [],
					text: item?.text,
					content: item?.content,
					message: item?.message,
					thinking: item?.thinking,
					fullItem: JSON.stringify(item).substring(0, 200), // Limit size but show structure
				}),
			);
		}

		if (generation.message.additional_kwargs) {
			debugInfo.additionalKwargsKeys = Object.keys(generation.message.additional_kwargs);
			debugInfo.additionalKwargs = JSON.stringify(generation.message.additional_kwargs).substring(
				0,
				500,
			);
		}
	}

	if (generation.text) {
		debugInfo.textValue = generation.text;
	}

	const generatedText = extractGeneratedText(generation);
	debugInfo.extractedTextLength = generatedText.length;
	debugInfo.extractedTextPreview = generatedText.substring(0, 500);

	// Check if this is a tool-calling scenario (no text but tool calls exist)
	const additionalKwargs = generation.message?.additional_kwargs;
	const hasToolCalls =
		additionalKwargs &&
		'tool_calls' in additionalKwargs &&
		Array.isArray(additionalKwargs.tool_calls) &&
		additionalKwargs.tool_calls.length > 0;

	const finishReason = generation.generationInfo?.finish_reason;
	const isToolCallingScenario = finishReason === 'tool_calls' || (hasToolCalls && !generatedText);

	debugInfo.hasToolCalls = hasToolCalls;
	debugInfo.finishReason = finishReason;
	debugInfo.isToolCallingScenario = isToolCallingScenario;

	ctx.executionContext.logger.info(
		'DEBUG: LLM generation structure for thought extraction',
		debugInfo,
	);

	// For tool-calling scenarios with no text, GPT-4o doesn't generate thoughts
	// The model goes straight to tool calls without reasoning text
	if (isToolCallingScenario && !generatedText) {
		ctx.executionContext.logger.debug(
			'Tool-calling scenario with no text - model thoughts not available (use synthetic thoughts instead)',
			{
				runId,
				toolCallCount:
					hasToolCalls && additionalKwargs && 'tool_calls' in additionalKwargs
						? additionalKwargs.tool_calls?.length || 0
						: 0,
			},
		);
		return;
	}

	if (!generatedText) {
		ctx.executionContext.logger.debug('No text content in LLM output', {
			runId,
			hasMessage: !!generation.message,
			hasText: !!generation.text,
		});
		return;
	}

	const thought = extractModelThought(generatedText, ctx.executionContext.logger);

	if (thought) {
		ctx.executionContext.logger.info('Extracted model thought', {
			runId,
			thoughtLength: thought.length,
			thoughtPreview: thought.substring(0, 100),
		});
		ctx.messageQueue.enqueue('thought', thought);
	} else {
		ctx.executionContext.logger.debug('No thought pattern found in output', {
			runId,
			textPreview: generatedText.substring(0, 200),
			textLength: generatedText.length,
		});
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

	ctx.executionContext.logger.info('LLM execution error', {
		runId,
		error: errorMessage,
	});

	ctx.messageQueue.enqueue('error', errorMessage);
}
