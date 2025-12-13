import { ITriggerFunctions } from 'n8n-workflow';
import { Channel, Socket } from 'phoenix';
import { eventHandlerRegistry } from '../../handlers/events/EventHandlerRegistry';
import { TriggerConfig, SingleRoomConfig } from '../../types';
import { logError } from '@lib/utils';
import { createAndJoinChatRoomChannel } from '@lib/socket';

/**
 * Handles incoming events using the appropriate event handler
 */
function handleEvent(
	rawData: unknown,
	config: TriggerConfig,
	triggerContext: ITriggerFunctions,
): void {
	try {
		eventHandlerRegistry.processEvent(config.event, rawData, config, triggerContext);
	} catch (error) {
		logError(triggerContext.logger, 'EventHandler: Failed to process event', error, {
			eventType: config.event,
			rawData,
		});
	}
}

/**
 * Sets up channel events for a Phoenix socket
 */
export async function setupChannelEvents(
	socket: Socket,
	config: SingleRoomConfig,
	triggerContext: ITriggerFunctions,
): Promise<Channel> {
	const triggerFunction = (rawData: unknown) => {
		handleEvent(rawData, config, triggerContext);
	};

	return createAndJoinChatRoomChannel(socket, {
		roomId: config.chatRoomId,
		event: config.event,
		onEvent: triggerFunction,
		logger: triggerContext.logger,
	});
}
