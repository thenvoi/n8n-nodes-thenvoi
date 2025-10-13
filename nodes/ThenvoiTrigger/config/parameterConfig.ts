import { INodeProperties, ITriggerFunctions, NodePropertyTypes } from 'n8n-workflow';
import { RoomMode, RoomModeType } from '../types';
import { RoomType } from '@lib/types';

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
	type: NodePropertyTypes;
	displayName: string;
	description: string;
	required?: boolean;
	default?: string | boolean | number | string[];
	options?: Array<{ name: string; value: string }>;
}

/**
 * Single source of truth for all optional parameter configuration
 * Each parameter defines its conditions and metadata
 */
export const OPTIONAL_PARAMETER_CONFIG: Record<string, ParameterConfig> = {
	// Room mode related parameters
	chatRoomId: {
		conditions: { roomMode: [RoomMode.SINGLE] },
		type: 'string',
		displayName: 'Chat Room ID',
		description: 'The ID of the chat room to listen to',
		required: true,
	},
	roomFilter: {
		conditions: { roomMode: [RoomMode.FILTERED] },
		type: 'string',
		displayName: 'Room Title Filter (Regex)',
		description:
			'Filter rooms by title using regex pattern (case-insensitive). Examples: "^support" for titles starting with "support", "team$" for titles ending with "team", or "bug|issue" for titles containing either word',
	},
	roomTypes: {
		conditions: { roomMode: [RoomMode.FILTERED] },
		type: 'multiOptions',
		displayName: 'Room Types',
		description: 'Filter by room types (leave empty for all types)',
		options: Object.values(RoomType).map((type) => ({
			name: type.charAt(0).toUpperCase() + type.slice(1),
			value: type,
		})),
		default: [],
	},
	autoSubscribe: {
		conditions: { roomMode: [RoomMode.ALL, RoomMode.FILTERED] },
		type: 'boolean' as const,
		displayName: 'Auto-Subscribe New Rooms',
		description: 'Automatically subscribe to new chat rooms as they are created',
		default: true,
	},
} as const;

function getParameterDefaultValue(config: ParameterConfig): string | boolean | number | string[] {
	return config.default ?? (config.type === 'multiOptions' ? [] : '');
}

function getParameterShowConditions(config: ParameterConfig): Record<string, string[]> {
	return Object.entries(config.conditions).reduce(
		(acc, [conditionKey, conditionValues]) => {
			acc[conditionKey] = conditionValues;
			return acc;
		},
		{} as Record<string, string[]>,
	);
}

function addMissingFields(param: INodeProperties, config: ParameterConfig): INodeProperties {
	if (config.type === 'multiOptions' && config.options) {
		param.options = config.options;
	}

	return param;
}

/**
 * Generates conditional UI parameters from the configuration
 */
export function generateConditionalUIParameters(): INodeProperties[] {
	return Object.entries(OPTIONAL_PARAMETER_CONFIG).map(([name, config]) => {
		const param: INodeProperties = {
			displayName: config.displayName,
			name,
			type: config.type,
			default: getParameterDefaultValue(config),
			required: config.required || false,
			description: config.description,
			displayOptions: {
				show: getParameterShowConditions(config),
			},
		};

		addMissingFields(param, config);

		return param;
	});
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
