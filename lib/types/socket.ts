export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	agentId: string;
	reconnectAfterMs?: (tries: number) => number;
}
