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
 * - "Thinking: [thought]"
 * - "Reasoning: [thought]"
 */
export function extractModelThought(text: string): string | null {
	const patterns = [/Thinking:\s*(.+?)(?:\n|$)/i, /Reasoning:\s*(.+?)(?:\n|$)/i];

	for (const pattern of patterns) {
		const match = text.match(pattern);
		if (match && match[1]) {
			return match[1].trim();
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
