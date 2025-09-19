import { Logger, MessageData, RawMessageData, SenderType } from '../types/types';

/**
 * Parses raw message data from the socket into properly typed MessageData
 */
export function parseMessageData(rawData: unknown, logger?: Logger): MessageData {
	if (!rawData || typeof rawData !== 'object') {
		throw new Error('Invalid raw data: expected object');
	}

	const data = rawData as RawMessageData;

	// Parse date strings to Date objects
	const insertedAt = parseDateString(data.inserted_at, 'inserted_at', logger);
	const updatedAt = parseDateString(data.updated_at, 'updated_at', logger);

	// Return the parsed data with proper types
	return {
		...data,
		sender_type:
			data.sender_type === 'User' || data.sender_type === 'Agent'
				? data.sender_type
				: ('User' as SenderType),
		inserted_at: insertedAt,
		updated_at: updatedAt,
	};
}

/**
 * Parses a date string into a Date object
 */
function parseDateString(dateString: string, fieldName: string, logger?: Logger): Date {
	if (!dateString) {
		logger?.warn(`Date parsing: Empty ${fieldName} string`);
		return new Date();
	}

	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			logger?.warn(`Date parsing: Invalid ${fieldName} format`, { dateString });
			return new Date();
		}
		return date;
	} catch (error) {
		logger?.warn(`Date parsing: Error parsing ${fieldName}`, { dateString, error });
		return new Date();
	}
}
