/**
 * Array Utilities
 *
 * Helper functions for array operations.
 */

/**
 * Finds the last element in array matching the predicate
 *
 * Polyfill for Array.findLast() which requires ES2023.
 *
 * @param array - Array to search
 * @param predicate - Function to test each element
 * @returns The last matching element, or undefined if not found
 */
export function findLast<T>(array: T[], predicate: (item: T) => boolean): T | undefined {
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i])) {
			return array[i];
		}
	}
	return undefined;
}
