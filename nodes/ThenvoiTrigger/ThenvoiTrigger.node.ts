import { ITriggerFunctions, ITriggerResponse, NodeOperationError } from 'n8n-workflow';
import { nodeDescription } from './config/nodeConfig';
import { handleRoomMode } from './handlers/events/roomModes/roomModeController';
import { ThenvoiCredentials } from '@lib/types';
import { getTriggerConfig } from './utils/configFactory';
import { getSafeErrorMessage, logError } from '@lib/utils';
import { createSocket } from '@lib/socket';
import { validateConfig, validateCredentials } from './utils/validation';

export class ThenvoiTrigger {
	description = nodeDescription;

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		try {
			const credentials = (await this.getCredentials('thenvoiApi')) as ThenvoiCredentials;
			validateCredentials(credentials, this);

			const config = getTriggerConfig(this, credentials.agentId);
			validateConfig(config, this);

			const socket = await createSocket(credentials, this.logger);

			return await handleRoomMode(socket, config, credentials, this);
		} catch (error) {
			logError(this.logger, 'Thenvoi Trigger: Failed to initialize', error);

			throw new NodeOperationError(
				this.getNode(),
				`Failed to initialize Thenvoi trigger: ${getSafeErrorMessage(error)}`,
			);
		}
	}
}
