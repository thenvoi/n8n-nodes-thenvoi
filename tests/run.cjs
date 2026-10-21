const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const result = spawnSync(
	process.execPath,
	process.argv.includes('--runtime')
		? [join(__dirname, 'credential-runtime.cjs')]
		: ['--test', join(__dirname, 'connection.test.cjs')],
	{
		stdio: 'inherit',
		env: { ...process.env, NODE_EXTRA_CA_CERTS: join(__dirname, 'fixtures/ca.pem') },
	},
);
process.exit(result.status ?? 1);
