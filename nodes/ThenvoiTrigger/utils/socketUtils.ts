import { Socket } from 'phoenix';
import { WebSocket } from 'ws';
import { SocketConfig, Logger } from '../types/types';

/**
 * Creates a Phoenix socket with the given configuration
 */
export function createSocket(config: SocketConfig, logger: Logger): Socket {
	const sanitizedUrl = config.serverUrl.replace(/\/socket$/, ''); // Remove sensitive path for logging
	logger.info('SocketManager: Creating socket connection', {
		serverUrl: sanitizedUrl,
	});

	const socket = new Socket(config.serverUrl, {
		params: {
			api_key: config.apiKey,
		},
		logger: (kind: string, msg: string, data?: unknown) => {
			logger.info(`Socket ${kind}: ${msg}`, { data });
		},
		reconnectAfterMs: config.reconnectAfterMs || defaultReconnectStrategy,
		transport: WebSocket,
	});

	setupSocketEventListeners(socket, logger);
	socket.connect();

	logger.info('SocketManager: Socket created and connected', {
		endPointURL: socket.endPointURL().toString(),
	});

	return socket;
}

/**
 * Default reconnection strategy: 5 minutes for all attempts
 */
const defaultReconnectStrategy = (): number => 1000 * 60 * 5;

/**
 * Sets up socket event listeners for connection monitoring
 */
function setupSocketEventListeners(socket: Socket, logger: Logger): void {
	socket.onOpen(() => {
		logger.info('SocketManager: WebSocket connection opened');
	});

	socket.onClose(() => {
		logger.info('SocketManager: WebSocket connection closed');
	});

	socket.onError((error: string | number | Event) => {
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
	});
}

/**
 * Disconnects a socket safely
 */
export function disconnectSocket(socket: Socket, logger: Logger): void {
	try {
		logger.info('SocketManager: Disconnecting socket');
		socket.disconnect();
	} catch (error) {
		logger.error('SocketManager: Error during socket disconnection', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
