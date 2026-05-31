import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class BandApi implements ICredentialType {
	name = 'bandApi';
	displayName = 'Band API';
	documentationUrl = 'https://docs.band.ai/';
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
			description: 'API key for authentication with Band server',
		},
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: 'app.band.ai/api/v1',
			required: true,
			description: 'Base URL of the Band server (without protocol)',
		},
		{
			displayName: 'Use HTTPS',
			name: 'useHttps',
			type: 'boolean',
			default: true,
			description: 'Use HTTPS for HTTP requests (WebSocket will always use WSS)',
		},
		{
			displayName: 'Agent ID',
			name: 'agentId',
			type: 'string',
			default: '',
			required: true,
			description: 'Agent ID for personalized channel subscriptions',
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

	// Test the connection to the Band server
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.useHttps ? "https://" : "http://"}}{{$credentials?.serverUrl}}',
			url: '/test',
			method: 'GET',
		},
	};
}
