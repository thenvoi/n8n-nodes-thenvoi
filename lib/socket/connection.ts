import { Logger } from 'n8n-workflow';
import { Socket } from 'phoenix';
import { SocketConfig, createBandWebSocket } from '../types';
import {
	getErrorMessage,
	INVALID_AUTH_TOKEN_ERROR_MESSAGE,
	isBandAuthError,
} from '../utils/errors';
import { raceWithTimeout } from '../utils/timeout';
import { ConnectionDiagnostics } from '../utils/diagnostics';
import { getSocketUrl } from '../utils/urls';

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
 * Creates socket options for Phoenix socket configuration
 */
function createSocketOptions(config: SocketConfig) {
	return {
		params: {
			agent_id: config.agentId,
		},
		reconnectAfterMs: config.reconnectAfterMs || DEFAULT_RECONNECT_STRATEGY,
		transport: createBandWebSocket(config.apiKey),
	};
}

/**
 * Handles socket open event, distinguishing between initial connection and reconnection
 */
function handleSocketOpen(
	socket: Socket,
	logger: Logger,
	isInitialConnection: boolean,
	onInitialConnect?: (socket: Socket) => void,
	onReconnect?: () => void | Promise<void>,
): void {
	if (isInitialConnection) {
		logger.info('SocketManager: Socket connected');
		onInitialConnect?.(socket);
	} else {
		logger.info('SocketManager: Socket reconnected');
		if (onReconnect) {
			// Call reconnection callback asynchronously to avoid blocking socket
			Promise.resolve()
				.then(onReconnect)
				.catch(() => {
					logger.error('SocketManager: Reconnection callback failed');
				});
		}
	}
}

/**
 * Sets up socket lifecycle event listeners
 */
function setupSocketLifecycleListeners(
	socket: Socket,
	logger: Logger,
	onInitialConnect?: (socket: Socket) => void,
	onReconnect?: () => void | Promise<void>,
): void {
	let isInitialConnection = true;

	socket.onOpen(() => {
		handleSocketOpen(socket, logger, isInitialConnection, onInitialConnect, onReconnect);
		if (isInitialConnection) {
			isInitialConnection = false;
		}
	});

	socket.onClose(() => {
		logger.info('SocketManager: Socket connection closed');
	});

	socket.onError(() => {
		logger.error('SocketManager: WebSocket connection error');
	});
}

/**
 * Creates a promise that resolves when the socket connects or rejects on error
 */
function createConnectionPromise(
	socket: Socket,
	logger: Logger,
	diagnostics: ConnectionDiagnostics,
	onReconnect?: () => void | Promise<void>,
): Promise<Socket> {
	return new Promise<Socket>((resolve, reject) => {
		let isResolved = false;

		const onInitialConnect = (connectedSocket: Socket) => {
			isResolved = true;
			resolve(connectedSocket);
		};

		setupSocketLifecycleListeners(socket, logger, onInitialConnect, onReconnect);

		socket.onError((error: string | number | Event) => {
			if (!isResolved) {
				if (isBandAuthError(error)) {
					reject(new Error(INVALID_AUTH_TOKEN_ERROR_MESSAGE));
					return;
				}

				const errorMessage = diagnostics.text(getErrorMessage(error));
				reject(new Error(`Socket connection failed: ${errorMessage}`));
			}
		});

		socket.connect();
	});
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Creates a Phoenix socket with the given configuration and waits for connection
 */
export async function createSocket(config: SocketConfig, logger: Logger): Promise<Socket> {
	const diagnostics = new ConnectionDiagnostics(config.apiKey);
	const socketUrl = getSocketUrl(config.serverUrl);
	const socketOptions = createSocketOptions(config);
	const socket = new Socket(socketUrl, socketOptions);

	// Wait for initial connection to be established (lifecycle listeners set up inside)
	try {
		return await waitForConnection(socket, logger, diagnostics, config.onReconnect);
	} catch (error) {
		socket.disconnect();
		throw diagnostics.error(error);
	}
}

/**
 * Waits for a socket to connect
 */
export async function waitForConnection(
	socket: Socket,
	logger: Logger,
	diagnostics: ConnectionDiagnostics,
	onReconnect?: () => void | Promise<void>,
): Promise<Socket> {
	const connectionPromise = createConnectionPromise(socket, logger, diagnostics, onReconnect);

	return raceWithTimeout(
		connectionPromise,
		CONNECTION_TIMEOUT,
		new Error('Socket connection timeout'),
	);
}
