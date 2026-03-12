import { fetchAgentProfile } from '../api';
import { HttpClient } from '../http';
import { ThenvoiCredentials } from '../types';
import { createInvalidAuthTokenNodeError, isThenvoiAuthError } from './errors';
import { INode, Logger } from 'n8n-workflow';

interface NodeAuthValidationContext {
	logger: Logger;
	getNode: () => INode;
}

/**
 * Validates Thenvoi credentials by calling the authenticated profile endpoint.
 * Throws a clear NodeOperationError when authentication is invalid.
 */
export async function validateThenvoiAuth(
	context: NodeAuthValidationContext,
	credentials: ThenvoiCredentials,
): Promise<void> {
	try {
		await fetchAgentProfile(new HttpClient(credentials, context.logger));
	} catch (error) {
		if (isThenvoiAuthError(error)) {
			throw createInvalidAuthTokenNodeError(context.getNode());
		}

		throw error;
	}
}
