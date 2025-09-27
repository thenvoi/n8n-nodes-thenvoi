import { Logger } from 'n8n-workflow';

/**
 * Parses a date string into a Date object
 * @param dateString The date string to parse
 * @param fieldName The name of the field being parsed (for logging)
 * @param logger Logger instance for error reporting
 * @returns Parsed Date object or current date if parsing fails
 */
export function parseDateString(dateString: string, fieldName: string, logger: Logger): Date {
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
