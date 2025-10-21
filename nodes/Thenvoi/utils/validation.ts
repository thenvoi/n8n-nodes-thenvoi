import { IExecuteFunctions, INode, NodeOperationError } from 'n8n-workflow';
import { ThenvoiCredentials } from '@lib/types';
import { validateCredentialsExist } from '@lib/utils';
import { MessageConfig } from '../types';

/**
 * Validates and extracts credentials from the execution context
 * Basic required field validation is handled by n8n's credential system
 * @param context - The execution context
 * @returns Validated credentials
 * @throws NodeOperationError if credentials are missing
 */
export async function getValidatedCredentials(
	context: IExecuteFunctions,
): Promise<ThenvoiCredentials> {
	const credentials = (await context.getCredentials('thenvoiApi')) as ThenvoiCredentials;

	validateCredentialsExist(credentials, context.getNode());

	return credentials;
}

/**
 * Validates message parameters
 * @param config - The message configuration
 * @param node - The node instance
 * @param itemIndex - The index of the item being processed
 * @throws NodeOperationError if parameters are invalid
 */
export function validateMessageConfig(config: MessageConfig, node: INode, itemIndex: number): void {
	if (!config.chatId) {
		throw new NodeOperationError(node, 'Chat ID is required', {
			itemIndex,
		});
	}

	if (!config.content) {
		throw new NodeOperationError(node, 'Message content is required', {
			itemIndex,
		});
	}
}
