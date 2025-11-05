/**
 * System prompt addition for model-generated thoughts
 *
 * This instructs compatible models to explicitly state their reasoning
 * before using tools. Not all models support this pattern.
 */
export const MODEL_THOUGHT_SYSTEM_PROMPT = `
Before using a tool, briefly state your reasoning in plain language.
Format: "Thinking: [your reasoning]"

Example: "Thinking: I'll check the current weather for that location."
`;

/**
 * Extracts model-generated thoughts from LLM output
 *
 * This is a best-effort extraction that looks for common thought patterns.
 * Not all models support explicit thought output. If no pattern is found,
 * returns null and synthetic thoughts can be used instead.
 *
 * Supported patterns:
 * - "Thinking: [thought]" (from model prompt instructions)
 * - "Reasoning: [thought]" (from model prompt instructions)
 * - "Thought: [thought]" (from ReAct agent format)
 * - Text before "Final Answer:" (ReAct agents sometimes output thoughts without prefix)
 * - Text before "Action:" (ReAct agents sometimes output thoughts without prefix)
 */
export function extractModelThought(text: string, logger?: any): string | null {
	if (!text || text.trim().length === 0) {
		return null;
	}

	// Try to match explicit thought patterns
	// Order matters: check "Thought:" first (ReAct format) before "Thinking:" to avoid conflicts
	const patterns = [
		/Thought:\s*(.+?)(?:\n|$)/i, // ReAct agent format with prefix
		/Thinking:\s*(.+?)(?:\n|$)/i, // Model prompt instructions
		/Reasoning:\s*(.+?)(?:\n|$)/i, // Alternative prompt format
	];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			const thought = match[1].trim();
			// Filter out action indicators that might be on the same line
			if (thought.length > 0 && !thought.toLowerCase().startsWith('action:')) {
				return thought;
			}
		}
	}

	// Fallback: For ReAct agents, GPT-4o sometimes outputs thought text without "Thought:" prefix
	// Look for text before "Final Answer:" that could be a thought
	const finalAnswerMatch = text.match(/Final Answer:/i);
	if (finalAnswerMatch && finalAnswerMatch.index !== undefined && finalAnswerMatch.index > 0) {
		const textBeforeFinalAnswer = text.substring(0, finalAnswerMatch.index).trim();

		// If there's meaningful text before "Final Answer:" and it's not too long (likely a thought, not full response)
		// and doesn't contain action patterns, treat it as a thought
		if (
			textBeforeFinalAnswer.length > 10 && // At least 10 chars to be meaningful
			textBeforeFinalAnswer.length < 500 &&
			!textBeforeFinalAnswer.toLowerCase().includes('action:') &&
			!textBeforeFinalAnswer.toLowerCase().includes('observation:') &&
			!textBeforeFinalAnswer.toLowerCase().includes('tool_call') &&
			!textBeforeFinalAnswer.toLowerCase().includes('question:') // Skip if it's the question line
		) {
			return textBeforeFinalAnswer;
		}
	}

	// Additional fallback: For ReAct intermediate steps, look for thought-like text before "Action:"
	// This handles cases like: "To find out the weather...\n\nAction: add_agent_to_chat"
	// Match "Action:" followed by optional whitespace and then a word (tool name)
	const actionMatch = text.match(/Action:\s*\w+/i);
	if (actionMatch && actionMatch.index !== undefined && actionMatch.index > 0) {
		const textBeforeAction = text.substring(0, actionMatch.index).trim();

		if (logger) {
			logger.debug('DEBUG: Checking text before Action:', {
				textBeforeAction,
				length: textBeforeAction.length,
				hasObservation: textBeforeAction.toLowerCase().includes('observation:'),
				hasToolCall: textBeforeAction.toLowerCase().includes('tool_call'),
				startsWithAction: textBeforeAction.toLowerCase().startsWith('action:'),
				hasQuestion: textBeforeAction.toLowerCase().includes('question:'),
			});
		}

		// Extract thought text if it's reasonable length and doesn't look like structured output
		if (
			textBeforeAction.length > 10 && // At least 10 chars to be meaningful
			textBeforeAction.length < 500 &&
			!textBeforeAction.toLowerCase().includes('observation:') &&
			!textBeforeAction.toLowerCase().includes('tool_call') &&
			!textBeforeAction.toLowerCase().startsWith('action:') &&
			!textBeforeAction.toLowerCase().includes('question:') // Skip if it's the question line
		) {
			if (logger) {
				logger.info('DEBUG: Extracted thought from text before Action:', {
					thought: textBeforeAction,
				});
			}
			return textBeforeAction;
		}
	}

	return null;
}

/**
 * Augments a prompt with model thought instructions
 */
export function augmentPromptForModelThoughts(prompt: string): string {
	return `${prompt}\n\n${MODEL_THOUGHT_SYSTEM_PROMPT}`;
}
