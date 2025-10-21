import { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { nodeDescription } from './config/nodeConfig';
import { createErrorResult, getValidatedCredentials, processItem } from './utils';

export class Thenvoi implements INodeType {
	description = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await getValidatedCredentials(this);
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (const [index, _item] of items.entries()) {
			try {
				const result = await processItem(this, credentials, index);
				returnData.push(result);
			} catch (error) {
				const errorResult = createErrorResult(this, error as Error, index);
				returnData.push(errorResult);
			}
		}

		return [returnData];
	}
}
