/**
 * Validates and extracts agent input data from various formats
 *
 * Tries to extract text input from different data structures:
 * 1. Direct string input
 * 2. Object with common field names (in priority order)
 * 3. First string field found in object
 * 4. Stringified object as fallback
 */
export function validateAgentInput(input: unknown): string {
	if (typeof input === 'string') {
		return input;
	}

	if (!input || typeof input !== 'object') {
		return '';
	}

	const inputObj = input as Record<string, unknown>;

	// Check common field names in priority order
	const priorityFields = ['input', 'chatInput', 'text', 'message', 'content', 'query', 'prompt'];

	for (const field of priorityFields) {
		const value = inputObj[field];
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
	}

	// Find any string field as fallback
	for (const [_, value] of Object.entries(inputObj)) {
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
	}

	// Last resort: stringify if object has content
	if (Object.keys(inputObj).length > 0) {
		return JSON.stringify(inputObj);
	}

	return '';
}
