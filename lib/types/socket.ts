import { ClientOptions, WebSocket } from 'ws';

export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	agentId: string;
	reconnectAfterMs?: (tries: number) => number;
	onReconnect?: () => void | Promise<void>;
}

export class ThenvoiWebSocket extends WebSocket {
	constructor(address: string, protocols?: string | string[], options: ClientOptions = {}) {
		super(address, protocols, {
			...options,
			headers: {
				'User-Agent': 'n8n-ThenvoiClient/1.0 (Node.js)',
				...options.headers,
			},
		});
	}
}
