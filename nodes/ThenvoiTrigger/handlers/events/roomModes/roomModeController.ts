import { ITriggerFunctions, ITriggerResponse } from 'n8n-workflow';
import { Socket } from 'phoenix';
import { ThenvoiCredentials } from '@lib/types';
import { TriggerConfig } from '../../../../ThenvoiTrigger/types';
import { RoomManager } from '../../../managers/RoomManager';

/**
 * Controller that manages the complete room mode lifecycle (start and cleanup) for all room modes (single, multi, filtered)
 */
export async function handleRoomMode(
	socket: Socket,
	config: TriggerConfig,
	credentials: ThenvoiCredentials,
	triggerContext: ITriggerFunctions,
): Promise<ITriggerResponse> {
	const roomManager = new RoomManager(socket, config, triggerContext, credentials);
	await roomManager.initialize();

	return {
		closeFunction: async () => {
			await roomManager.cleanup();
			socket.disconnect();
		},
	};
}
