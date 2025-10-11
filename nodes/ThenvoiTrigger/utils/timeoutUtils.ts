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
