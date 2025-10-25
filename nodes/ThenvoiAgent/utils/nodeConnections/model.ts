import { IExecuteFunctions, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Retrieves the AI model from the connected input
 */
export async function getConnectedModel(ctx: IExecuteFunctions): Promise<BaseChatModel> {
	const connectedModel = (await ctx.getInputConnectionData(
		NodeConnectionType.AiLanguageModel,
		0,
	)) as BaseChatModel | undefined;

	if (!connectedModel) {
		throw new NodeOperationError(
			ctx.getNode(),
			'AI Language Model must be connected to the Model input',
		);
	}

	return connectedModel;
}
