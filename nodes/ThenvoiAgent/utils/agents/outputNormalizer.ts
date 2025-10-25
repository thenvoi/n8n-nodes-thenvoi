import { IExecuteFunctions } from 'n8n-workflow';
import { AgentOutput, ContentBlock } from '../../types/langchain';

/**
 * Extracts text content from content blocks
 */
function extractTextFromBlocks(blocks: ContentBlock[], ctx?: IExecuteFunctions): string {
	const textParts: string[] = [];
	const otherBlocks: Array<{ type: string; hasContent: boolean }> = [];

	for (const block of blocks) {
		if (block.type === 'text') {
			const text = block.text || '';
			if (text.length > 0) {
				textParts.push(text);
			}
		} else {
			otherBlocks.push({
				type: block.type,
				hasContent: !!(
					('text' in block && block.text) ||
					('thinking' in block && block.thinking) ||
					('input' in block && block.input)
				),
			});
		}
	}

	if (otherBlocks.length > 0 && ctx) {
		ctx.logger.debug('Found non-text content blocks in agent output', {
			textBlocks: textParts.length,
			otherBlocks,
		});
	}

	return textParts.join('\n\n');
}

/**
 * Normalizes agent output to a string
 *
 * LangChain agents can return output in different formats:
 * 1. Simple string - returned as-is
 * 2. Content blocks array - text blocks are extracted and joined
 * 3. Object with text property - text property is extracted
 *
 * Content blocks may include:
 * - 'text': Regular text content (what we want)
 * - 'tool_use': Tool/function calls (handled during execution)
 * - 'thinking': Extended thinking blocks (Claude extended thinking feature)
 *
 * This normalization ensures we always return a clean string to the user.
 */
export function normalizeAgentOutput(output: AgentOutput, ctx?: IExecuteFunctions): string {
	if (typeof output === 'string') {
		return output;
	}

	if (Array.isArray(output)) {
		return extractTextFromBlocks(output, ctx);
	}

	if (output && typeof output === 'object' && 'text' in output) {
		return String((output as any).text);
	}

	return String(output || '');
}
