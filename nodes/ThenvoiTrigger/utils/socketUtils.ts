import { Channel, Socket } from 'phoenix';
import { WebSocket } from 'ws';
import { SocketConfig } from '../types';
import { Logger } from 'n8n-workflow';
import { getSocketUrl } from './urlUtils';

/**
 * Default reconnection strategy: 5 minutes for all attempts
 */
const DEFAULT_RECONNECT_STRATEGY = (): number => 1000 * 60 * 5;

/**
 * Connection timeout in milliseconds
 */
const CONNECTION_TIMEOUT = 10000;

/**
 * Creates a Phoenix socket with the given configuration and waits for connection
 */
export async function createSocket(config: SocketConfig, logger: Logger): Promise<Socket> {
	const socketUrl = getSocketUrl(config.serverUrl);
	const socket = new Socket(socketUrl, {
		params: {
			api_key: config.apiKey,
		},
		logger: (kind: string, msg: string, data?: unknown) => {
			logger.info(`Socket ${kind}: ${msg}`, { data });
		},
		reconnectAfterMs: config.reconnectAfterMs || DEFAULT_RECONNECT_STRATEGY,
		transport: WebSocket,
	});

	setupSocketEventListeners(socket, logger);

	// Wait for connection to be established
	return waitForConnection(socket, logger);
}

/**
 * Sets up connection event handlers for a socket
 */
function setupConnectionHandlers(
	socket: Socket,
	logger: Logger,
	resolve: (socket: Socket) => void,
	reject: (error: Error) => void,
): void {
	socket.onOpen(() => {
		logger.info('SocketManager: Socket connected');
		resolve(socket);
	});

	socket.onError((error: string | number | Event) => {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error('SocketManager: WebSocket connection error', {
			error:
				error instanceof Error
					? {
							message: error.message,
							name: error.name,
							stack: error.stack,
						}
					: error,
		});
		reject(new Error(`Socket connection failed: ${errorMessage}`));
	});
}

/**
 * Creates a timeout promise that rejects after the specified duration
 */
function createConnectionTimeout(duration: number, logger: Logger): Promise<never> {
	return new Promise((_, reject) => {
		setTimeout(() => {
			logger.error('SocketManager: Connection timeout');
			reject(new Error('Socket connection timeout'));
		}, duration);
	});
}

/**
 * Waits for a socket to connect
 */
export async function waitForConnection(socket: Socket, logger: Logger): Promise<Socket> {
	const connectionPromise = new Promise<Socket>((resolve, reject) => {
		setupConnectionHandlers(socket, logger, resolve, reject);
		socket.connect();
	});

	const timeoutPromise = createConnectionTimeout(CONNECTION_TIMEOUT, logger);

	// Race between connection and timeout
	return Promise.race([connectionPromise, timeoutPromise]);
}

/**
 * Disconnects a socket safely
 */
export function disconnectSocket(socket: Socket, channel: Channel, logger: Logger): void {
	try {
		channel.leave();
		socket.disconnect();
	} catch (error) {
		logger.error('SocketManager: Error during socket disconnection', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Sets up socket event listeners for connection monitoring
 */
function setupSocketEventListeners(socket: Socket, logger: Logger): void {
	socket.onClose(() => {
		logger.info('SocketManager: Socket connection closed');
	});
}
