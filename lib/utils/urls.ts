import { ThenvoiCredentials } from '../types';

/**
 * URL protocols for different connection types
 */
export const URL_PROTOCOLS = {
	WEBSOCKET: 'wss',
	HTTP: 'https',
	HTTP_INSECURE: 'http',
} as const;

/**
 * URL paths for different connection types
 */
export const URL_PATHS = {
	WEBSOCKET: '/socket',
	HTTP: '',
} as const;

/**
 * Gets the WebSocket URL from credentials
 */
export function getSocketUrl(serverUrl: string): string {
	return buildUrl(serverUrl, URL_PROTOCOLS.WEBSOCKET, URL_PATHS.WEBSOCKET);
}

/**
 * Gets the HTTP API URL from credentials
 */
export function getHttpUrl(credentials: ThenvoiCredentials, useHttps: boolean = true): string {
	const protocol = useHttps ? URL_PROTOCOLS.HTTP : URL_PROTOCOLS.HTTP_INSECURE;
	return buildUrl(credentials.serverUrl, protocol, URL_PATHS.HTTP);
}

/**
 * Builds a complete URL from base URL, protocol, and path
 */
function buildUrl(baseUrl: string, protocol: string, path: string): string {
	// Remove existing protocol if present
	const cleanUrl = baseUrl.replace(/^https?:\/\//, '');

	// Build the complete URL
	return `${protocol}://${cleanUrl}${path}`;
}
