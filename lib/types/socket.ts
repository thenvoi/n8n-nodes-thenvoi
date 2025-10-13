export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	reconnectAfterMs?: (tries: number) => number;
}
