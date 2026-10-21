import { ClientOptions, WebSocket } from 'ws';

export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	agentId: string;
	reconnectAfterMs?: (tries: number) => number;
	onReconnect?: () => void | Promise<void>;
}

/** Each Phoenix socket keeps its own transport credential, including reconnects. */
export function createBandWebSocket(
	apiKey: string,
): new (address: string, protocols?: string | string[], options?: ClientOptions) => WebSocket {
	if (!apiKey.trim()) throw new Error('Band API key is required');
	return class BandWebSocket extends WebSocket {
		constructor(address: string, protocols?: string | string[], options: ClientOptions = {}) {
			const headers = { ...options.headers };
			const authHeaders = Object.keys(headers).filter((name) => name.toLowerCase() === 'x-api-key');
			if (authHeaders.length > 1 && new Set(authHeaders.map((name) => headers[name])).size > 1) {
				throw new Error('Conflicting WebSocket authentication headers');
			}
			for (const name of authHeaders) delete headers[name];
			super(address, protocols, {
				...options,
				headers: { 'User-Agent': 'n8n-BandClient/1.0 (Node.js)', ...headers, 'x-api-key': apiKey },
			});
		}
	};
}
