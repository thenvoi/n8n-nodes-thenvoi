import { Channel, Socket } from 'phoenix';
import { WebSocket } from 'ws';
import { SocketConfig, Logger } from '../types/types';

/**
 * Default reconnection strategy: 5 minutes for all attempts
 */
const DEFAULT_RECONNECT_STRATEGY = (): number => 1000 * 60 * 5;

/**
 * Creates a Phoenix socket with the given configuration
 */
export function createSocket(config: SocketConfig, logger: Logger): Socket {
	const socket = new Socket(config.serverUrl, {
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
	socket.connect();

	return socket;
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
	socket.onOpen(() => {
		// Connection opened
	});

	socket.onClose(() => {
		// Connection closed
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
