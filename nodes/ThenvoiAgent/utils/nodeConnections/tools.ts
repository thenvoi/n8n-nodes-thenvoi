import { IExecuteFunctions, NodeConnectionType } from 'n8n-workflow';
import { StructuredTool } from '@langchain/core/tools';

/**
 * Retrieves AI tools from the connected inputs
 */
export async function getConnectedTools(ctx: IExecuteFunctions): Promise<StructuredTool[]> {
	const tools: StructuredTool[] = [];

	const connectedTools = (await ctx.getInputConnectionData(NodeConnectionType.AiTool, 0)) as
		| StructuredTool[]
		| StructuredTool
		| undefined;

	if (connectedTools) {
		if (Array.isArray(connectedTools)) {
			tools.push(...connectedTools);
		} else {
			tools.push(connectedTools);
		}
	}

	return tools;
}
