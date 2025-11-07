export interface SocketConfig {
	serverUrl: string;
	apiKey: string;
	agentId: string;
	reconnectAfterMs?: (tries: number) => number;
	onReconnect?: () => void | Promise<void>;
}
