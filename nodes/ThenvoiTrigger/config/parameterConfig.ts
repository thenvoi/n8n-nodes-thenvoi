import { INodeProperties, ITriggerFunctions } from 'n8n-workflow';
import { RoomMode, RoomModeType } from '../types';

/**
 * Type for all possible conditions that can be used to determine parameter visibility
 */
export interface ParameterConditions {
	roomMode?: RoomModeType;
	event?: string;
	// Future conditions can be added here
	// user?: string;
	// timeRange?: string;
}

/**
 * Type definition for parameter configuration
 */
export interface ParameterConfig {
	conditions: Record<string, string[]>;
	type: 'string' | 'boolean' | 'number';
	displayName: string;
	description: string;
	required?: boolean;
	default?: string | boolean | number;
}

/**
 * Single source of truth for all optional parameter configuration
 * Each parameter defines its conditions and metadata
 */
export const OPTIONAL_PARAMETER_CONFIG: Record<string, ParameterConfig> = {
	// Room mode related parameters
	chatRoomId: {
		conditions: { roomMode: [RoomMode.SINGLE] },
		type: 'string' as const,
		displayName: 'Chat Room ID',
		description: 'The ID of the chat room to listen to',
		required: true,
	},
	roomFilter: {
		conditions: { roomMode: [RoomMode.FILTERED] },
		type: 'string' as const,
		displayName: 'Room Filter Pattern',
		description: 'Filter rooms by name pattern (e.g., "support-*")',
	},
	autoSubscribe: {
		conditions: { roomMode: [RoomMode.ALL, RoomMode.FILTERED] },
		type: 'boolean' as const,
		displayName: 'Auto-Subscribe New Rooms',
		description: 'Automatically subscribe to new chat rooms as they are created',
		default: true,
	},
} as const;

/**
 * Generates conditional UI parameters from the configuration
 */
export function generateConditionalUIParameters(): INodeProperties[] {
	return Object.entries(OPTIONAL_PARAMETER_CONFIG).map(([name, config]) => ({
		displayName: config.displayName,
		name,
		type: config.type,
		default: config.default || '',
		required: config.required || false,
		description: config.description,
		displayOptions: {
			show: {
				roomMode: config.conditions.roomMode,
			},
		},
	}));
}

/**
 * Extracts conditional parameters based on current conditions
 */
export function extractConditionalParameters(
	conditions: ParameterConditions,
	triggerContext: ITriggerFunctions,
): Partial<Record<keyof typeof OPTIONAL_PARAMETER_CONFIG, unknown>> {
	const params: Partial<Record<keyof typeof OPTIONAL_PARAMETER_CONFIG, unknown>> = {};

	Object.entries(OPTIONAL_PARAMETER_CONFIG).forEach(([paramName, config]) => {
		// Check if all conditions match
		const matches = Object.entries(config.conditions).every(([conditionKey, conditionValues]) => {
			const currentValue = conditions[conditionKey as keyof ParameterConditions];
			return conditionValues.includes(currentValue as string);
		});

		if (matches) {
			params[paramName as keyof typeof OPTIONAL_PARAMETER_CONFIG] =
				triggerContext.getNodeParameter(paramName);
		}
	});

	return params;
}
