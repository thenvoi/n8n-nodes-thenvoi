/**
 * Creates a generic cancelable timeout promise
 * Returns both the promise and a cancel function
 */
export function createCancelableTimeout<T>(
	duration: number,
	rejectWith: T,
): { promise: Promise<never>; cancel: () => void } {
	let timeoutId: NodeJS.Timeout;

	const promise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(rejectWith);
		}, duration);
	});

	const cancel = () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	};

	return { promise, cancel };
}

/**
 * Races a promise against a timeout, with proper cleanup
 */
export async function raceWithTimeout<T>(
	operationPromise: Promise<T>,
	timeoutMs: number,
	timeoutError: Error,
): Promise<T> {
	const { promise: timeoutPromise, cancel: cancelTimeout } = createCancelableTimeout(
		timeoutMs,
		timeoutError,
	);

	// Race between operation and timeout
	try {
		const result = await Promise.race([operationPromise, timeoutPromise]);
		// If we get here, the operation succeeded, so cancel the timeout
		cancelTimeout();
		return result;
	} catch (error) {
		// If we get here, either operation failed or timeout occurred
		cancelTimeout();
		throw error;
	}
}
