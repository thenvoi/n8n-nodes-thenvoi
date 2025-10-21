import { ChatMessageType } from '@lib/types';
import { IExecuteFunctions, INodeExecutionData, INodeType, NodeOperationError } from 'n8n-workflow';
import { nodeDescription } from './config/nodeConfig';
import { MessageConfig } from './types';
import { getValidatedCredentials, validateMessageConfig, sendMessage } from './utils';

export class Thenvoi implements INodeType {
	description = nodeDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await getValidatedCredentials(this);

		for (let i = 0; i < items.length; i++) {
			try {
				const config: MessageConfig = {
					chatId: this.getNodeParameter('chatId', i) as string,
					content: this.getNodeParameter('content', i) as string,
					messageType: this.getNodeParameter('messageType', i) as ChatMessageType,
				};

				validateMessageConfig(config, this.getNode(), i);

				const response = await sendMessage(this, config, credentials);

				returnData.push({
					json: response,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message || 'Unknown error occurred',
						},
						pairedItem: { item: i },
					});
					continue;
				}

				throw new NodeOperationError(
					this.getNode(),
					`Failed to send message: ${error.message || 'Unknown error'}`,
					{ itemIndex: i },
				);
			}
		}

		return [returnData];
	}
}
