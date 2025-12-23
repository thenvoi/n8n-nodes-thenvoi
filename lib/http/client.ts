import { Logger } from 'n8n-workflow';
import { ThenvoiCredentials, ThenvoiApiError } from '../types';
import { logError, createApiError } from '../utils/errors';
import { getHttpUrl } from '../utils/urls';

/**
 * HTTP client for making API requests to Thenvoi
 */
export class HttpClient {
	private baseUrl: string;

	constructor(
		private credentials: ThenvoiCredentials,
		private logger: Logger,
	) {
		this.baseUrl = getHttpUrl(credentials, credentials.useHttps);
	}

	/**
	 * Makes a GET request to the Thenvoi API
	 *
	 * @param endpoint - API endpoint path (e.g., '/agent/chats')
	 * @param params - Optional query parameters
	 * @returns Promise resolving to the response data of type T
	 */
	async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		const url = this.buildUrl(endpoint, params);
		return this.request<T>(url, 'GET', endpoint);
	}

	/**
	 * Makes a POST request to the Thenvoi API
	 *
	 * @param endpoint - API endpoint path (e.g., '/agent/chats/{id}/messages')
	 * @param body - Optional request body (will be JSON stringified)
	 * @returns Promise resolving to the response data of type T, or undefined for 204 No Content responses
	 */
	async post<T>(endpoint: string, body?: unknown): Promise<T> {
		const url = this.buildUrl(endpoint);
		return this.request<T>(url, 'POST', endpoint, body);
	}

	/**
	 * Makes a DELETE request to the Thenvoi API
	 *
	 * @param endpoint - API endpoint path (e.g., '/agent/chats/{id}/participants/{id}')
	 * @returns Promise resolving to the response data of type T, or undefined for 204 No Content responses
	 */
	async delete<T>(endpoint: string): Promise<T> {
		const url = this.buildUrl(endpoint);
		return this.request<T>(url, 'DELETE', endpoint);
	}

	/**
	 * Makes an HTTP request with common error handling and response parsing
	 *
	 * Handles 204 No Content responses by returning undefined (type assertion required
	 * as generic T doesn't express "no response body"). Logs errors before re-throwing
	 * to ensure error context is captured even if error handling fails upstream.
	 *
	 * @param url - Complete URL including base URL and query parameters
	 * @param method - HTTP method (GET, POST, DELETE, etc.)
	 * @param endpoint - API endpoint path (used for error logging context)
	 * @param body - Optional request body (will be JSON stringified)
	 * @param headers - Optional additional headers to merge with default headers
	 * @returns Promise resolving to the response data of type T, or undefined for 204 responses
	 */
	private async request<T>(
		url: string,
		method: string,
		endpoint: string,
		body?: unknown,
		headers?: Record<string, string>,
	): Promise<T> {
		try {
			const fetchOptions: RequestInit = {
				method,
				headers: {
					accept: 'application/json',
					'X-API-Key': this.credentials.apiKey,
					'Content-Type': 'application/json',
					...headers,
				},
			};

			if (body !== undefined) {
				fetchOptions.body = JSON.stringify(body);
			}

			const response = await fetch(url, fetchOptions);

			if (!response.ok) {
				const error = await createApiError(response);
				logError(this.logger, 'HTTP request failed', error, { endpoint, method, status: error.status });
				throw error;
			}

			// Handle 204 No Content responses (e.g., DELETE operations, POST processing endpoints)
			// Type assertion is necessary here as the generic T doesn't express "no response body".
			// Callers using endpoints that return 204 should expect undefined or use void as T.
			if (response.status === 204) {
				return undefined as T;
			}

			return (await response.json()) as T;
		} catch (error) {
			// Log and re-throw if not already a ThenvoiApiError
			if (!(error instanceof ThenvoiApiError)) {
				logError(this.logger, 'HTTP request failed', error, { endpoint, method });
			}

			throw error;
		}
	}

	/**
	 * Builds a complete URL for the API endpoint
	 *
	 * Combines base URL with endpoint path and appends query parameters.
	 *
	 * @param endpoint - API endpoint path (e.g., '/agent/chats')
	 * @param params - Optional query parameters to append as URL search params
	 * @returns Complete URL string ready for fetch()
	 */
	private buildUrl(endpoint: string, params?: Record<string, string>): string {
		const url = new URL(`${this.baseUrl}${endpoint}`);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.set(key, value);
			});
		}

		return url.toString();
	}
}
