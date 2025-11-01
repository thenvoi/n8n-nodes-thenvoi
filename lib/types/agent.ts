/**
 * Agent Type Definitions
 *
 * Types for Thenvoi agents
 */

/**
 * Basic agent information for listing and selection
 */
export interface AgentBasicInfo {
	id: string;
	name: string;
	description: string;
}

/**
 * Full agent model from Thenvoi API
 */
export interface Agent {
	id: string;
	name: string;
	description: string;
	inserted_at: string;
	updated_at: string;
	organization_id: string | null;
	is_global: boolean;
	owner_uuid: string;
	is_external: boolean;
	model_type: string;
	system_prompt_id: string;
	structured_output_schema?: {
		type: string;
		json_schema?: unknown;
	};
}
