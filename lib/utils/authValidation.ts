import { fetchAgentProfile } from '../api';
import { HttpClient } from '../http';
import { BandCredentials } from '../types';
import { createInvalidAuthTokenNodeError, isBandAuthError } from './errors';
import { INode, Logger } from 'n8n-workflow';

interface NodeAuthValidationContext {
	logger: Logger;
	getNode: () => INode;
}

/**
 * Validates Band credentials by calling the authenticated profile endpoint.
 * Throws a clear NodeOperationError when authentication is invalid.
 */
export async function validateBandAuth(
	context: NodeAuthValidationContext,
	credentials: BandCredentials,
): Promise<void> {
	try {
		await fetchAgentProfile(new HttpClient(credentials, context.logger));
	} catch (error) {
		if (isBandAuthError(error)) {
			throw createInvalidAuthTokenNodeError(context.getNode());
		}

		throw error;
	}
}
