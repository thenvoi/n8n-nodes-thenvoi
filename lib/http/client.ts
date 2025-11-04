import { Logger } from 'n8n-workflow';
import { ThenvoiCredentials } from '../types';
import { logError } from '../utils/errors';
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
	 */
	async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		const url = this.buildUrl(endpoint, params);
		return this.request<T>(url, 'GET', endpoint);
	}

	/**
	 * Makes a POST request to the Thenvoi API
	 */
	async post<T>(endpoint: string, body?: unknown): Promise<T> {
		const url = this.buildUrl(endpoint);
		return this.request<T>(url, 'POST', endpoint, body);
	}

	/**
	 * Makes an HTTP request with common error handling and response parsing
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
				throw new Error(`API request failed: ${response.status} ${response.statusText}`);
			}

			return (await response.json()) as T;
		} catch (error) {
			logError(this.logger, 'HTTP request failed', error, { endpoint });

			throw error;
		}
	}

	/**
	 * Builds a complete URL for the API endpoint
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
