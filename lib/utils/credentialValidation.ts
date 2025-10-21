import { NodeOperationError, INode } from 'n8n-workflow';
import { ThenvoiCredentials } from '../types';

/**
 * Validates that credentials exist
 * Basic required field validation is handled by n8n's credential system
 * @param credentials - The credentials to validate
 * @param node - The node instance for error context
 * @param errorMessage - Optional custom error message
 * @throws NodeOperationError if credentials are missing
 */
export function validateCredentialsExist(
	credentials: ThenvoiCredentials | null | undefined,
	node: INode,
	errorMessage = 'No credentials provided. Please configure Thenvoi API credentials.',
): void {
	if (!credentials) {
		throw new NodeOperationError(node, errorMessage);
	}
}
