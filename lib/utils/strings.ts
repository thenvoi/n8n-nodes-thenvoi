/**
 * String Utilities
 *
 * General-purpose string manipulation utilities.
 */

/**
 * Escapes special regex characters in a string
 *
 * Use this when constructing regex patterns from user input or dynamic strings
 * to prevent regex injection and ensure literal matching.
 *
 * @param text - The string to escape
 * @returns The escaped string safe for use in regex patterns
 *
 * @example
 * ```typescript
 * const userInput = "test (value)";
 * const pattern = new RegExp(escapeRegex(userInput)); // Matches "test (value)" literally
 * ```
 */
export function escapeRegex(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
