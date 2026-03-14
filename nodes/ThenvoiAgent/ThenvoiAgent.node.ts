import { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { nodeDescription } from './config/nodeConfig';
import { processAgentItem } from './utils';

/**
 * Thenvoi AI Agent Node
 *
 * Full AI Agent implementation with LangChain callback streaming to Thenvoi.
 *
 * Features:
 * - AI Language Model connections (OpenAI, Anthropic, Gemini, etc.)
 * - AI Tool connections (multiple tools supported)
 * - AI Memory connections (conversation memory)
 * - Real-time streaming of agent activity to Thenvoi chat
 * - Tool calls, tool results, thoughts, and final responses
 * - Configurable agent behavior (max iterations, prompt, etc.)
 * - Extensible capability system for adding new features
 */
export class ThenvoiAgent implements INodeType {
	description = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = (await this.getCredentials('thenvoiApi')) as ThenvoiCredentials;

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (const [index, item] of items.entries()) {
			const result = await processAgentItem(this, item, credentials, index);
			returnData.push(result);
		}

		return [returnData];
	}
}
