import { ChatMessageType } from '@lib/types';
import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { MessageConfig } from '../types';
import { validateMessageConfig, sendMessage } from './';

/**
 * Extracts message configuration from node parameters
 */
function getMessageConfig(context: IExecuteFunctions, itemIndex: number): MessageConfig {
	return {
		chatId: context.getNodeParameter('chatId', itemIndex) as string,
		content: context.getNodeParameter('content', itemIndex) as string,
		messageType: context.getNodeParameter('messageType', itemIndex) as ChatMessageType,
	};
}

/**
 * Processes a single item: validates, sends message, and returns execution data
 */
export async function processItem(
	context: IExecuteFunctions,
	credentials: ThenvoiCredentials,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const config = getMessageConfig(context, itemIndex);

	validateMessageConfig(config, context.getNode(), itemIndex);

	const response = await sendMessage(context, config, credentials);

	return {
		json: response,
		pairedItem: { item: itemIndex },
	};
}

/**
 * Creates error result for a failed item based on continueOnFail setting
 */
export function createErrorResult(
	context: IExecuteFunctions,
	error: Error,
	itemIndex: number,
): INodeExecutionData {
	if (context.continueOnFail()) {
		return {
			json: {
				error: error.message || 'Unknown error occurred',
			},
			pairedItem: { item: itemIndex },
		};
	}

	throw new NodeOperationError(
		context.getNode(),
		`Failed to send message: ${error.message || 'Unknown error'}`,
		{ itemIndex },
	);
}
