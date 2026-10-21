import { ITriggerFunctions, ITriggerResponse, NodeOperationError } from 'n8n-workflow';
import { testBandCredentials } from '@lib/utils/authValidation';
import { nodeDescription } from './config/nodeConfig';
import { initializeRoomModeTrigger } from './handlers/events/roomModes/roomModeController';
import { BandCredentials } from '@lib/types';
import { getTriggerConfig } from './utils/configFactory';
import { getSafeErrorMessage, validateBandAuth } from '@lib/utils';
import { validateConfig, validateCredentials } from './utils/validation';
import { RoomManager } from './managers/RoomManager';

export class BandTrigger {
	description = nodeDescription;

	methods = { credentialTest: { bandApiTest: testBandCredentials } };

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		try {
			const credentials = (await this.getCredentials('bandApi')) as BandCredentials;
			validateCredentials(credentials, this);
			await validateBandAuth(this, credentials);

			const config = getTriggerConfig(this, credentials.agentId);
			validateConfig(config, this);

			const roomManager = new RoomManager(config, this, credentials);
			return await initializeRoomModeTrigger(roomManager);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw error;
			}

			this.logger.error('Band Trigger: Failed to initialize');

			throw new NodeOperationError(
				this.getNode(),
				`Failed to initialize Band trigger: ${getSafeErrorMessage(error)}`,
			);
		}
	}
}
