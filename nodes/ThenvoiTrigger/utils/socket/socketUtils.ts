import { Logger } from 'n8n-workflow';
import { Socket } from 'phoenix';
import { WebSocket } from 'ws';
import { SocketConfig } from '../../types';
import { getErrorMessage, logError } from '../errorUtils';
import { createCancelableTimeout } from '../timeoutUtils';
import { getSocketUrl } from '../urlUtils';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default reconnection strategy: 5 minutes for all attempts
 */
const DEFAULT_RECONNECT_STRATEGY = (): number => 1000 * 60 * 5;

/**
 * Connection timeout in milliseconds
 */
const CONNECTION_TIMEOUT = 10000;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a socket logger function that formats Phoenix socket messages
 */
function createSocketLogger(logger: Logger) {
	return (kind: string, msg: string, data?: unknown) => {
		const formattedMessage = typeof msg === 'object' ? JSON.stringify(msg) : msg;
		logger.info(`Socket ${kind}: ${formattedMessage}`, { data });
	};
}

/**
 * Creates socket options for Phoenix socket configuration
 */
function createSocketOptions(config: SocketConfig, logger: Logger) {
	return {
		params: {
			api_key: config.apiKey,
		},
		logger: createSocketLogger(logger),
		reconnectAfterMs: config.reconnectAfterMs || DEFAULT_RECONNECT_STRATEGY,
		transport: WebSocket,
	};
}

/**
 * Sets up socket event listeners for connection monitoring
 */
function setupSocketEventListeners(socket: Socket, logger: Logger): void {
	socket.onClose(() => {
		logger.info('SocketManager: Socket connection closed');
	});
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
		const errorMessage = getErrorMessage(error);
		logError(logger, 'SocketManager: WebSocket connection error', error);
		reject(new Error(`Socket connection failed: ${errorMessage}`));
	});
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Creates a Phoenix socket with the given configuration and waits for connection
 */
export async function createSocket(config: SocketConfig, logger: Logger): Promise<Socket> {
	const socketUrl = getSocketUrl(config.serverUrl);
	const socketOptions = createSocketOptions(config, logger);
	const socket = new Socket(socketUrl, socketOptions);

	setupSocketEventListeners(socket, logger);

	// Wait for connection to be established
	return waitForConnection(socket, logger);
}

/**
 * Waits for a socket to connect
 */
export async function waitForConnection(socket: Socket, logger: Logger): Promise<Socket> {
	const connectionPromise = new Promise<Socket>((resolve, reject) => {
		setupConnectionHandlers(socket, logger, resolve, reject);
		socket.connect();
	});

	const { promise: timeoutPromise, cancel: cancelTimeout } = createCancelableTimeout(
		CONNECTION_TIMEOUT,
		new Error('Socket connection timeout'),
	);

	// Race between connection and timeout
	try {
		const result = await Promise.race([connectionPromise, timeoutPromise]);
		// If we get here, the connection succeeded, so cancel the timeout
		cancelTimeout();
		return result;
	} catch (error) {
		// If we get here, either connection failed or timeout occurred
		cancelTimeout();
		throw error;
	}
}
