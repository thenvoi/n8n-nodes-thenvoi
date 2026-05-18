import { ITriggerResponse } from 'n8n-workflow';
import { RoomManager } from '../../../managers/RoomManager';

/**
 * Initializes the room mode trigger by setting up socket and room subscriptions
 */
export async function initializeRoomModeTrigger(
	roomManager: RoomManager,
): Promise<ITriggerResponse> {
	const socket = await roomManager.initializeSocket();
	await roomManager.initialize();

	return {
		closeFunction: async () => {
			await roomManager.cleanup();
			socket.disconnect();
		},
	};
}
