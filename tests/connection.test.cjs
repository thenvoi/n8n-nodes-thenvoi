const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspect } = require('node:util');
const { peer, captureLogger } = require('./peer.cjs');
const { createSocket } = require('../dist/lib/socket/connection');
const { getSocketUrl, getHttpUrl } = require('../dist/lib/utils/urls');
const { validateBandAuth, testBandCredentials } = require('../dist/lib/utils/authValidation');
const { BandTrigger } = require('../dist/nodes/BandTrigger/BandTrigger.node');
const { BandApi } = require('../dist/credentials/BandApi.credentials');
const { ConnectionDiagnostics } = require('../dist/lib/utils/diagnostics');
const { createBandWebSocket } = require('../dist/lib/types/socket');
const key = 'synthetic-key +/&=alpha';
const creds = (serverUrl, apiKey = key) => ({
	serverUrl,
	apiKey,
	agentId: 'agent',
	useHttps: true,
});
function noSecrets(value, secrets = [key]) {
	const raw = inspect(value, { depth: null });
	for (const secret of secrets)
		for (const form of [
			secret,
			encodeURIComponent(secret),
			encodeURI(secret),
			new URLSearchParams({ k: secret }).toString().slice(2),
		]) {
			assert.ok(!raw.includes(form), 'Raw diagnostic contains a credential');
		}
}

test(
	'initial, concurrent sockets and crossed reconnects use isolated headers and clean URLs',
	{ timeout: 10000 },
	async (t) => {
		const p = await peer(t),
			{ logger, records } = captureLogger();
		const keys = [key, 'second-synthetic-key+beta'];
		const sockets = await Promise.all(
			keys.map((apiKey, i) =>
				createSocket(
					{
						...creds(`${p.serverUrl}?API%5FKEY=old-secret&token=legacy`, apiKey),
						agentId: `agent-${i}`,
						reconnectAfterMs: () => 5,
					},
					logger,
				),
			),
		);
		t.after(() => sockets.forEach((s) => s.disconnect()));
		p.connections[1].terminate();
		await p.waitFor(3);
		p.connections[0].terminate();
		await p.waitFor(4);
		for (const request of p.requests) {
			const url = new URL(request.url, 'https://localhost');
			const i = Number(url.searchParams.get('agent_id').slice(-1));
			assert.equal(request.headers['x-api-key'], keys[i]);
			assert.equal(url.pathname, '/api/v1/socket/websocket');
			assert.deepEqual([...url.searchParams.keys()].sort(), ['agent_id', 'vsn']);
			assert.match(request.headers['user-agent'], /n8n-BandClient/);
		}
		noSecrets(records, keys.concat('old-secret', 'legacy'));
		assert.ok(records.some((r) => r.args[0].includes('reconnected')));
	},
);

test('URL normalization preserves documented paths and rejects unsupported forms before I/O', () => {
	for (const base of [
		'app.band.ai/api/v1',
		'https://app.band.ai/api/v1/',
		'http://app.band.ai/api/v1',
	]) {
		assert.equal(getSocketUrl(base), 'wss://app.band.ai/api/v1/socket');
		assert.equal(getHttpUrl(creds(base), false), 'http://app.band.ai/api/v1');
	}
	assert.equal(
		getSocketUrl('app.band.ai/api/v1?API%5fKEY=x&api_key=y&TOKEN=z'),
		'wss://app.band.ai/api/v1/socket',
	);
	for (const base of [
		'app.band.ai?other=secret',
		'app.band.ai#secret',
		'https://user:secret@app.band.ai',
		'wss://app.band.ai',
	]) {
		assert.throws(() => getSocketUrl(base), /Invalid Band server URL/);
	}
});

test('URL normalization preserves explicit ports when selecting the transport protocol', () => {
	assert.equal(getSocketUrl('http://host:80/api/v1'), 'wss://host:80/api/v1/socket');
	assert.equal(getHttpUrl(creds('host:443/api/v1'), false), 'http://host:443/api/v1');
	assert.equal(getHttpUrl(creds('http://host:80/api/v1'), true), 'https://host:80/api/v1');
	assert.equal(getSocketUrl('http://[::1]:80/api/v1'), 'wss://[::1]:80/api/v1/socket');
});

test('HTTP preflight and registered credential test share clean URL/header handling, including insecure HTTP', async (t) => {
	for (const secure of [true, false]) {
		const p = await peer(t, { secure }),
			{ logger, records } = captureLogger();
		const credentials = {
			...creds(`${p.serverUrl}?TOKEN=legacy&API_KEY=legacy`),
			useHttps: secure,
		};
		await validateBandAuth({ logger, getNode: () => ({}) }, credentials);
		const node = new BandTrigger();
		assert.equal(new BandApi().test, undefined);
		const registration = node.description.credentials.find((c) => c.name === 'bandApi').testedBy;
		const result = await node.methods.credentialTest[registration].call(
			{ logger },
			{ data: credentials },
		);
		assert.equal(result.status, 'OK');
		assert.equal(p.requests.length, 2);
		for (const req of p.requests) {
			assert.equal(req.url, '/api/v1/agent/me');
			assert.equal(req.headers['x-api-key'], key);
		}
		noSecrets(records);
	}
});

test('refused preflight sanitizes server message, code, details and request ID before raw logging and return', async (t) => {
	const leaked = `invalid% ${key} ${encodeURIComponent(key)} ${encodeURIComponent(key).replace('%2B', '%2b')}`;
	const p = await peer(t, {
		response: {
			error: {
				message: leaked,
				code: leaked,
				request_id: leaked,
				details: { authorization: [leaked] },
			},
		},
	});
	const { logger, records } = captureLogger();
	let rejected;
	try {
		await validateBandAuth({ logger, getNode: () => ({}) }, creds(p.serverUrl));
	} catch (error) {
		rejected = error;
	}
	assert.ok(rejected);
	noSecrets(rejected);
	const result = await testBandCredentials.call({ logger }, { data: creds(p.serverUrl) });
	assert.equal(result.status, 'Error');
	noSecrets([records, result]);
});

test(
	'refused upgrade rejects without query fallback or retained reconnect work',
	{ timeout: 10000 },
	async (t) => {
		const p = await peer(t, { refuse: true }),
			{ logger, records } = captureLogger();
		await assert.rejects(
			createSocket({ ...creds(p.serverUrl), reconnectAfterMs: () => 5 }, logger),
		);
		assert.equal(p.requests.length, 1);
		assert.equal(p.requests[0].headers['x-api-key'], key);
		assert.ok(!p.requests[0].url.includes('api_key'));
		noSecrets(records);
	},
);

test(
	'Phoenix diagnostic objects and reconnect callback errors cannot forward arbitrary secrets',
	{ timeout: 10000 },
	async (t) => {
		const p = await peer(t),
			{ logger, records } = captureLogger();
		const socket = await createSocket(
			{
				...creds(p.serverUrl),
				reconnectAfterMs: () => 5,
				onReconnect: async () => {
					throw new Error(`callback ${key} ${encodeURIComponent(key)}`);
				},
			},
			logger,
		);
		t.after(() => socket.disconnect());
		socket.log('error', `x-api-key=${key}`, { nested: { key }, error: new Error(key) });
		p.connections[0].terminate();
		await p.waitFor(2);
		await new Promise((resolve) => socket.onOpen(() => setImmediate(resolve)));
		noSecrets(records);
		assert.ok(records.some((r) => r.level === 'error'));
		const safe = new ConnectionDiagnostics(key).error(new Error(`token=unknown-token ${key}`));
		noSecrets(safe);
		assert.ok(!safe.message.includes('unknown-token'));
	},
);

test('ambiguous caller authentication headers are rejected before network I/O', () => {
	const Transport = createBandWebSocket(key);
	assert.throws(
		() => new Transport('wss://127.0.0.1', [], { headers: { 'x-api-key': 'a', 'X-API-Key': 'b' } }),
		/Conflicting/,
	);
});

test(
	'channel join and explicit disconnect retain lifecycle behavior',
	{ timeout: 10000 },
	async (t) => {
		const p = await peer(t),
			{ logger } = captureLogger();
		const socket = await createSocket(creds(p.serverUrl), logger);
		t.after(() => socket.disconnect());
		const channel = socket.channel('agent:test');
		await new Promise((resolve, reject) =>
			channel.join().receive('ok', resolve).receive('error', reject),
		);
		assert.equal(channel.state, 'joined');
		await new Promise((resolve) => socket.disconnect(resolve));
		assert.equal(socket.isConnected(), false);
	},
);

test(
	'connection timeout closes pending transport without query fallback',
	{ timeout: 15000 },
	async (t) => {
		const p = await peer(t, { hold: true }),
			{ logger, records } = captureLogger();
		await assert.rejects(createSocket(creds(p.serverUrl), logger), /Socket connection timeout/);
		assert.equal(p.requests.length, 1);
		noSecrets(records);
	},
);

test('credential-shaped headers and encoded unknown query credentials are removed from text diagnostics', () => {
	const diagnostics = new ConnectionDiagnostics(key);
	for (const text of [
		'authorization: Bearer unlistedsecret',
		'authorization: Basic unlistedsecret',
		'"x-api-key":"unlistedsecret"',
		'https://host?api%5Fkey=unlistedsecret',
	]) {
		assert.ok(!diagnostics.text(text).includes('unlistedsecret'));
	}
});

test('actual trigger startup rejects sanitized preflight errors without starting a socket', async (t) => {
	const privateData = 'synthetic-person@example.invalid';
	const p = await peer(t, { response: { error: { message: `${key} ${privateData}`, code: key, request_id: key } } });
	const { logger, records } = captureLogger();
	let rejected;
	try {
		await new BandTrigger().trigger.call({
			logger,
			getNode: () => ({}),
			getCredentials: async () => creds(p.serverUrl),
		});
	} catch (error) {
		rejected = error;
	}
	assert.ok(rejected);
	assert.equal(p.requests.length, 1);
	assert.equal(p.requests[0].type, 'http');
	noSecrets([rejected, records]);
	assert.equal(inspect(records, { depth: null }).includes(privateData), false);
});

test('unsupported configured URLs reject in every entry point before any request', async (t) => {
	const p = await peer(t),
		{ logger, records } = captureLogger();
	const credentials = creds(`${p.serverUrl}?unsupported=${encodeURIComponent(key)}`);
	await assert.rejects(
		validateBandAuth({ logger, getNode: () => ({}) }, credentials),
		/Invalid Band server URL/,
	);
	await assert.rejects(createSocket(credentials, logger), /Invalid Band server URL/);
	const result = await testBandCredentials.call({ logger }, { data: credentials });
	assert.equal(result.status, 'Error');
	assert.equal(p.requests.length, 0);
	noSecrets([records, result]);
});

test('authentication preflight refuses credential-bearing redirects before a second request', async (t) => {
	const p = await peer(t, { redirect: `/api/v1/agent/me?api_key=${encodeURIComponent(key)}` });
	const { logger, records } = captureLogger();
	await assert.rejects(validateBandAuth({ logger, getNode: () => ({}) }, creds(p.serverUrl)));
	assert.equal(p.requests.length, 1);
	noSecrets(records);
});

test('mixed percent-escape casing is scrubbed even beside malformed URL escapes', () => {
	const diagnostic = new ConnectionDiagnostics(key);
	const mixed = encodeURIComponent(key).replace('%2B', '%2b');
	assert.equal(diagnostic.text(`invalid% ${mixed}`), 'invalid% [REDACTED]');
	assert.equal(diagnostic.text(key.toUpperCase()), key.toUpperCase());
});

test('literal percent escapes and regular expression punctuation in credentials remain fully masked', () => {
	for (const secret of ['literal%2Fsecret', 'key[.*+?^${}()|]\\end', 'unicode-π-secret']) {
		const diagnostic = new ConnectionDiagnostics(secret);
		assert.equal(diagnostic.text(`echo ${secret}`), 'echo [REDACTED]');
		assert.equal(diagnostic.text(`echo ${encodeURIComponent(secret)}`), 'echo [REDACTED]');
	}
});

test('raw connection logs omit untrusted channel payloads and HTTP user content', async (t) => {
	const marker = 'synthetic-person@example.invalid 198.51.100.7 private-user-message';
	const { HttpClient } = require('../dist/lib/http/client');
	const { createAndJoinChannel } = require('../dist/lib/socket/channels');
	const { subscribeToRoom } = require('../dist/nodes/BandTrigger/utils/rooms/roomSubscriptions');
	const { logger, records } = captureLogger();
	const p = await peer(t, {
		response: { data: { email: marker } },
		status: 200,
		joinResponse: { profile: marker, cookie: 'session=synthetic-session' },
	});
	const http = new HttpClient(creds(p.serverUrl), logger);
	assert.deepEqual(await http.get('/agent/me'), { data: { email: marker } });
	const socket = await createSocket(creds(p.serverUrl), logger);
	t.after(() => socket.disconnect());
	await createAndJoinChannel(socket, { channelName: `chat_room:${marker}`, events: {}, logger });
	const failed = await peer(t, {
		response: { error: { message: marker, request_id: marker } },
		status: 400,
		joinStatus: 'error',
		joinResponse: { message: marker, cookie: 'session=synthetic-session' },
	});
	await assert.rejects(
		new HttpClient(creds(failed.serverUrl), logger).post('/messages', { content: marker }),
	);
	const refusedSocket = await createSocket(creds(failed.serverUrl), logger);
	t.after(() => refusedSocket.disconnect());
	const subscriptions = new Map();
	await assert.rejects(
		subscribeToRoom(refusedSocket, marker, { event: 'message_created' }, subscriptions, () => {}, logger),
		/Unable to join Band channel/,
	);
	assert.equal(subscriptions.size, 0);
	assert.equal(
		inspect(records, { depth: null }).includes(marker),
		false,
		'Raw logger received user content',
	);
	assert.equal(
		inspect(records, { depth: null }).includes('synthetic-session'),
		false,
		'Raw logger received a cookie',
	);
	assert.ok(records.some(({ args }) => args[0] === 'HTTP request failed'));
	assert.ok(records.some(({ args }) => args[0] === 'Failed to subscribe to room'));
});
