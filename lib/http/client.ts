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

		try {
			const response = await fetch(url, {
				headers: {
					'X-API-Key': this.credentials.apiKey,
					'Content-Type': 'application/json',
				},
			});

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
