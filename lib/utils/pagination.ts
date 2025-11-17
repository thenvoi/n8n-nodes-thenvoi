/**
 * Generic Pagination Utility
 *
 * Fetches data in pages until limit reached or no more data available.
 * Reusable for any paginated endpoint (rooms, messages, participants, etc.).
 *
 * Following CODE_STYLE_PREFERENCES.MD:
 * - Generic function: works with any type
 * - Single responsibility: only handles pagination logic
 * - Reusable: eliminates duplication across API methods
 * - Clear naming: describes what it does
 */

import { Logger } from 'n8n-workflow';

export interface PaginationOptions<T> {
	/**
	 * Function to fetch a single page of data
	 */
	fetchPage: (page: number, perPage: number) => Promise<T[]>;

	/**
	 * Number of items per page
	 */
	perPage: number;

	/**
	 * Optional: Maximum total items to fetch
	 * If not provided, fetches all available pages
	 */
	limit?: number;

	/**
	 * Logger for progress tracking
	 */
	logger: Logger;

	/**
	 * Resource name for logging (e.g., "rooms", "messages")
	 */
	resourceName: string;
}

/**
 * Fetches paginated data until limit reached or no more pages available
 *
 * @returns Array of fetched items (up to limit if specified)
 */
export async function fetchPaginated<T>(options: PaginationOptions<T>): Promise<T[]> {
	const { fetchPage, perPage, limit, logger, resourceName } = options;
	const allItems: T[] = [];
	let page = 1;

	while (true) {
		const items = await fetchPage(page, perPage);

		logger.debug(`Fetched ${resourceName} page`, { page, itemCount: items.length });

		allItems.push(...items);

		// Stop if no more items (empty page or partial page)
		if (items.length === 0 || items.length < perPage) {
			break;
		}

		// Stop if we've reached the limit
		if (limit && allItems.length >= limit) {
			break;
		}

		page++;
	}

	// Return only up to limit if specified
	const result = limit ? allItems.slice(0, limit) : allItems;

	logger.info(`Fetched ${resourceName}`, {
		pagesFetched: page,
		totalFetched: allItems.length,
		returned: result.length,
		...(limit && { requestedLimit: limit }),
	});

	return result;
}

