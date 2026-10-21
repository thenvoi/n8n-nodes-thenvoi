import { fetchAgentProfile } from '../api';
import { HttpClient } from '../http';
import { BandCredentials } from '../types';
import { createInvalidAuthTokenNodeError, isBandAuthError } from './errors';
import {
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
	INode,
	Logger,
} from 'n8n-workflow';

import { ConnectionDiagnostics } from './diagnostics';

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
		await validateCredentialsProfile(credentials, context.logger);
	} catch (error) {
		if (isBandAuthError(error)) {
			throw createInvalidAuthTokenNodeError(context.getNode());
		}

		throw error;
	}
}

async function validateCredentialsProfile(
	credentials: BandCredentials,
	logger: Logger,
): Promise<void> {
	await fetchAgentProfile(
		new HttpClient(credentials, logger, new ConnectionDiagnostics(credentials.apiKey)),
	);
}

export async function testBandCredentials(
	this: ICredentialTestFunctions,
	credentials: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const data = credentials.data as unknown as BandCredentials;
	try {
		await validateCredentialsProfile(data, this.logger);
		return { status: 'OK', message: 'Band authentication succeeded' };
	} catch (error) {
		return {
			status: 'Error',
			message: new ConnectionDiagnostics(data.apiKey).error(error).message,
		};
	}
}
