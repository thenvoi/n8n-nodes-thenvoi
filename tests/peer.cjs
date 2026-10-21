const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const { join } = require('node:path');
const { once, EventEmitter } = require('node:events');
const { WebSocketServer } = require('ws');

async function peer(
	t,
	{
		secure = true,
		refuse = false,
		response,
		status,
		redirect,
		hold = false,
		joinResponse = {},
		joinStatus = 'ok',
	} = {},
) {
	const requests = [],
		events = new EventEmitter(),
		connections = [];
	const handler = (req, res) => {
		requests.push({ url: req.url, headers: req.headers, type: 'http' });
		events.emit('request');
		if (redirect) {
			res.writeHead(302, { location: redirect });
			res.end();
			return;
		}
		res.writeHead(status ?? (response ? 403 : 200), { 'content-type': 'application/json' });
		res.end(JSON.stringify(response || { data: { id: 'agent' } }));
	};
	const server = secure
		? https.createServer(
				{
					key: fs.readFileSync(join(__dirname, 'fixtures/server-key.pem')),
					cert: fs.readFileSync(join(__dirname, 'fixtures/ca.pem')),
				},
				handler,
			)
		: http.createServer(handler);
	const wss = new WebSocketServer({ noServer: true });
	server.on('upgrade', (req, socket, head) => {
		requests.push({ url: req.url, headers: req.headers, type: 'websocket' });
		events.emit('request');
		if (hold) {
			connections.push(socket);
			return;
		}
		if (refuse) {
			socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n');
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			connections.push(ws);
			ws.on('message', (data) => {
				const [joinRef, ref, topic, event] = JSON.parse(data.toString());
				ws.send(
					JSON.stringify([
						joinRef,
						ref,
						topic,
						'phx_reply',
						{ status: joinStatus, response: joinResponse },
					]),
				);
			});
		});
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(async () => {
		for (const ws of connections) {
			if (ws.terminate) ws.terminate();
			else ws.destroy();
		}
		wss.close();
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	});
	return {
		requests,
		connections,
		serverUrl: `127.0.0.1:${server.address().port}/api/v1`,
		async waitFor(count) {
			while (requests.length < count) await once(events, 'request');
		},
	};
}
function captureLogger() {
	const records = [];
	const logger = Object.fromEntries(
		['info', 'debug', 'warn', 'error'].map((level) => [
			level,
			(...args) => records.push({ level, args }),
		]),
	);
	return { logger, records };
}
module.exports = { peer, captureLogger };
