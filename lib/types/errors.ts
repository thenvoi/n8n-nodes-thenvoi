/**
 * Error information for logging
 */
export interface ErrorInfo {
	message: string;
	name?: string;
	stack?: string;
}

/**
 * Structured error response from Band API
 */
export interface ApiErrorResponse {
	error: {
		code: string;
		message: string;
		details?: Record<string, string[]>;
		request_id: string;
	};
}

/**
 * Properties for BandApiError class
 */
export interface BandApiErrorProperties {
	status: number;
	code?: string;
	details?: Record<string, string[]>;
	requestId?: string;
}

/**
 * Custom error class for Band API errors
 *
 * Extends Error with structured error information from API responses.
 * Includes HTTP status code, error code, validation details, and request ID.
 */
export class BandApiError extends Error implements BandApiErrorProperties {
	status: number;
	code?: string;
	details?: Record<string, string[]>;
	requestId?: string;

	constructor(
		message: string,
		status: number,
		code?: string,
		details?: Record<string, string[]>,
		requestId?: string,
	) {
		super(message);
		this.name = 'BandApiError';
		this.status = status;
		this.code = code;
		this.details = details;
		this.requestId = requestId;
	}
}
