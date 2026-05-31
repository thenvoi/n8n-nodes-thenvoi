import { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { BandCredentials } from '@lib/types';
import { nodeDescription } from './config/nodeConfig';
import { processAgentItem } from './utils';

/**
 * Band AI Agent Node
 *
 * Full AI Agent implementation with LangChain callback streaming to Band.
 *
 * Features:
 * - AI Language Model connections (OpenAI, Anthropic, Gemini, etc.)
 * - AI Tool connections (multiple tools supported)
 * - AI Memory connections (conversation memory)
 * - Real-time streaming of agent activity to Band chat
 * - Tool calls, tool results, thoughts, and final responses
 * - Configurable agent behavior (max iterations, prompt, etc.)
 * - Extensible capability system for adding new features
 */
export class BandAgent implements INodeType {
	description = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = (await this.getCredentials('bandApi')) as BandCredentials;

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (const [index, item] of items.entries()) {
			const result = await processAgentItem(this, item, credentials, index);
			returnData.push(result);
		}

		return [returnData];
	}
}
