import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ThenvoiApi implements ICredentialType {
	name = 'thenvoiApi';
	displayName = 'Thenvoi API';
	documentationUrl = 'https://thenvoi.com/docs/';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			},
			description: 'API key for authentication with Thenvoi server',
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'staging.thenvoi.com/api/v2',
			required: true,
			description: 'Base URL of the Thenvoi server (without protocol)',
		},
		{
			displayName: 'Use HTTPS',
			name: 'useHttps',
			type: 'boolean',
			default: true,
			description: 'Use HTTPS for HTTP requests (WebSocket will always use WSS)',
		},
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			required: true,
			description: 'User ID for personalized channel subscriptions',
		},
	];

	// This allows the credential to be used by other parts of n8n
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// Test the connection to the Thenvoi server
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.useHttps ? "https://" : "http://"}}{{$credentials?.serverUrl}}',
			url: '/health',
			method: 'GET',
		},
	};
}
