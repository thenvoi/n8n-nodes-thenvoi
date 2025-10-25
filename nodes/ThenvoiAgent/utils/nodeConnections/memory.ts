import { IExecuteFunctions, NodeConnectionType } from 'n8n-workflow';
import { BaseMemory } from 'langchain/memory';

/**
 * Retrieves memory from the connected input
 */
export async function getConnectedMemory(ctx: IExecuteFunctions): Promise<BaseMemory | undefined> {
	const connectedMemory = (await ctx.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
		| BaseMemory
		| undefined;

	return connectedMemory;
}
