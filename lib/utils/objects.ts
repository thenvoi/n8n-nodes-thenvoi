/**
 * Conditionally includes a property in an object if the value is defined and truthy.
 * For arrays, checks that the array has length > 0.
 * Empty strings are excluded (treated as "no value").
 *
 * @param key - The property key/name to use in the resulting object.
 * @param value - The value to include. If undefined, null, empty string, or (for arrays) empty, the property won't be included.
 * @returns An object with the property if value is truthy, or an empty object otherwise.
 *
 * @example
 * ```typescript
 * const obj = {
 *   name: 'John',
 *   ...includeProperty('age', age), // Same name
 *   ...includeProperty('participant_type', participantType), // Different name
 *   ...includeProperty('mentions', mentions), // Only included if array has items
 * };
 * ```
 */
export function includeProperty<T>(
	key: string,
	value: T | undefined | null,
): Record<string, T> | Record<string, never> {
	if (value === undefined || value === null) {
		return {};
	}

	// Exclude empty strings
	if (value === '') {
		return {};
	}

	// For arrays, check that they have items
	if (Array.isArray(value) && value.length === 0) {
		return {};
	}

	return { [key]: value } as Record<string, T>;
}
