import { ITriggerFunctions, NodeOperationError } from 'n8n-workflow';
import { extractConditionalParameters, OPTIONAL_PARAMETER_CONFIG } from '../config/parameterConfig';
import { eventHandlerRegistry } from '../handlers/events/EventHandlerRegistry';
import { TriggerConfig, RoomMode, RoomModeType } from '../types';

/**
 * Config factory functions with proper typing
 */
function createSingleRoomConfig(
	eventType: string,
	conditionalParams: Partial<Record<keyof typeof OPTIONAL_PARAMETER_CONFIG, unknown>>,
) {
	return {
		roomMode: RoomMode.SINGLE,
		event: eventType,
		chatRoomId: conditionalParams.chatRoomId as string,
	} as const;
}

function createAllRoomsConfig(
	eventType: string,
	conditionalParams: Partial<Record<keyof typeof OPTIONAL_PARAMETER_CONFIG, unknown>>,
) {
	return {
		roomMode: RoomMode.ALL,
		event: eventType,
		autoSubscribe: conditionalParams.autoSubscribe as boolean,
	} as const;
}

function createFilteredRoomsConfig(
	eventType: string,
	conditionalParams: Partial<Record<keyof typeof OPTIONAL_PARAMETER_CONFIG, unknown>>,
) {
	return {
		roomMode: RoomMode.FILTERED,
		event: eventType,
		roomFilter: conditionalParams.roomFilter as string,
		roomTypes: conditionalParams.roomTypes as string[],
		autoSubscribe: conditionalParams.autoSubscribe as boolean,
	} as const;
}

/**
 * Creates base configuration based on room mode and conditional parameters
 */
function createBaseConfig(
	eventType: string,
	roomMode: RoomModeType,
	conditionalParams: Partial<Record<keyof typeof OPTIONAL_PARAMETER_CONFIG, unknown>>,
	triggerContext: ITriggerFunctions,
): TriggerConfig {
	const configFactories = {
		[RoomMode.SINGLE]: () => createSingleRoomConfig(eventType, conditionalParams),
		[RoomMode.ALL]: () => createAllRoomsConfig(eventType, conditionalParams),
		[RoomMode.FILTERED]: () => createFilteredRoomsConfig(eventType, conditionalParams),
	};

	const factory = configFactories[roomMode];
	if (!factory) {
		throw new NodeOperationError(triggerContext.getNode(), `Unknown room mode: ${roomMode}`);
	}

	return factory();
}

/**
 * Adds event-specific parameters to the configuration
 */
function addEventSpecificParameters(
	baseConfig: TriggerConfig,
	eventType: string,
	triggerContext: ITriggerFunctions,
): TriggerConfig {
	const eventSpecificParams = eventHandlerRegistry.getEventSpecificParameters(eventType);
	const eventConfig: any = { ...baseConfig };

	eventSpecificParams.forEach((param) => {
		if (param.name && typeof param.name === 'string') {
			eventConfig[param.name] = triggerContext.getNodeParameter(param.name);
		}
	});

	return eventConfig;
}

/**
 * Gets the trigger configuration from node parameters
 */
export function getTriggerConfig(triggerContext: ITriggerFunctions): TriggerConfig {
	const eventType = triggerContext.getNodeParameter('event') as string;
	const roomMode = triggerContext.getNodeParameter('roomMode') as RoomModeType;
	const conditionalParams = extractConditionalParameters({ roomMode }, triggerContext);

	const baseConfig = createBaseConfig(eventType, roomMode, conditionalParams, triggerContext);
	return addEventSpecificParameters(baseConfig, eventType, triggerContext);
}
