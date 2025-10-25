import { Serialized } from '@langchain/core/load/serializable';
import { summarizeInput } from '../messages/toolFormatters';

/**
 * Tool kwargs interface for accessing description
 */
interface ToolKwargs {
	description?: string;
}

/**
 * Gets a label for the tool - uses description if available, otherwise name
 */
function getToolLabel(tool: Serialized): string {
	const kwargs = (tool as any).kwargs as ToolKwargs | undefined;

	if (kwargs?.description) {
		return kwargs.description;
	}

	if (tool.name) {
		return tool.name;
	}

	if (Array.isArray(tool.id) && tool.id.length > 0) {
		return tool.id[tool.id.length - 1] || 'tool';
	}

	return 'tool';
}

/**
 * Generates a thought message for when a tool starts
 */
export function generateToolStartThought(tool: Serialized, input: string): string {
	const toolLabel = getToolLabel(tool);
	const inputSummary = summarizeInput(input, 80);

	return inputSummary.length > 0
		? `Using ${toolLabel} with input: ${inputSummary}`
		: `Using ${toolLabel} tool`;
}

/**
 * Generates a thought message for when a tool completes
 */
export function generateToolEndThought(tool: Serialized, output?: string): string {
	const toolLabel = getToolLabel(tool);
	return output?.length ? `${toolLabel} completed` : `${toolLabel} finished`;
}

/**
 * Generates a thought message for errors
 */
export function generateErrorThought(tool: Serialized, error: Error): string {
	const toolLabel = getToolLabel(tool);
	return `${toolLabel} error: ${error.message}`;
}
