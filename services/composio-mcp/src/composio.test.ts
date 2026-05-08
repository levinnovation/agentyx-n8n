import test from 'node:test';
import assert from 'node:assert/strict';

import { ComposioClient } from './composio.js';

type JsonBody = Record<string, unknown>;

function jsonResponse(body: JsonBody, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
	const previous: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(vars)) {
		previous[key] = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	return fn().finally(() => {
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});
}

test('connected accounts parser supports v3.1 and legacy appName fields', async () => {
	await withEnv(
		{
			COMPOSIO_SMART_DEFAULT: 'true',
			COMPOSIO_ENTITY_ID: 'u1',
			COMPOSIO_CONNECTED_ACCOUNT_ID: undefined,
		},
		async () => {
			const originalFetch = global.fetch;
			global.fetch = (async (input: string | URL | Request) => {
				const url = String(input instanceof Request ? input.url : input);
				if (url.includes('/tools?')) {
					return jsonResponse({
						items: [
							{
								slug: 'GMAIL_SEND_EMAIL',
								name: 'Send Gmail',
								description: 'Send email',
								toolkit: { slug: 'gmail', name: 'Gmail' },
								input_parameters: { type: 'object', properties: {} },
							},
						],
						next_cursor: null,
					});
				}
				if (url.includes('/connected_accounts?')) {
					return jsonResponse({
						items: [
							{
								id: 'ca-gmail',
								status: 'active',
								toolkit: { slug: 'gmail' },
								user_id: 'u1',
								updated_at: '2026-05-07T12:00:00Z',
							},
							{
								id: 'ca-slack',
								status: 'ACTIVE',
								appName: 'SLACK',
								user_id: 'u1',
								updated_at: '2026-05-07T10:00:00Z',
							},
						],
						next_cursor: null,
					});
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;

			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				const tools = await client.listTools('cid-1', { entityId: 'u1', maxTools: 10 });
				assert.ok(tools.some((tool) => tool.slug === 'GMAIL_SEND_EMAIL'));

				const debug = await client.getConnectedAccountsDebug('cid-2', { entityId: 'u1' });
				assert.equal(debug.count, 2);
				assert.ok(debug.byToolkit.gmail?.some((account) => account.id === 'ca-gmail'));
				assert.ok(debug.byToolkit.slack?.some((account) => account.id === 'ca-slack'));
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});

async function runExecuteCase(args: {
	caseName: string;
	envConnected?: string;
	connectedAccounts: JsonBody[];
	executeOptions?: { entityId?: string; connectedAccountId?: string };
	expectedConnectedAccountId?: string;
}) {
	const executeBodies: JsonBody[] = [];
	await withEnv(
		{
			COMPOSIO_ENTITY_ID: 'u1',
			COMPOSIO_CONNECTED_ACCOUNT_ID: args.envConnected,
			COMPOSIO_SMART_DEFAULT: 'true',
		},
		async () => {
			const originalFetch = global.fetch;
			global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
				const url = String(input instanceof Request ? input.url : input);
				if (url.includes('/tools?')) {
					return jsonResponse({
						items: [
							{
								slug: 'GMAIL_SEND_EMAIL',
								name: 'Send Gmail',
								description: 'Send email',
								toolkit: { slug: 'gmail', name: 'Gmail' },
								input_parameters: { type: 'object', properties: {} },
							},
						],
						next_cursor: null,
					});
				}
				if (url.includes('/connected_accounts?')) {
					return jsonResponse({
						items: args.connectedAccounts,
						next_cursor: null,
					});
				}
				if (url.includes('/tools/execute/')) {
					if (!init?.body || typeof init.body !== 'string') {
						throw new Error(`execute body missing for ${args.caseName}`);
					}
					executeBodies.push(JSON.parse(init.body) as JsonBody);
					return jsonResponse({ ok: true });
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;

			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				await client.executeTool('GMAIL_SEND_EMAIL', { to: 'a@example.com' }, `cid-${args.caseName}`, args.executeOptions);
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
	assert.equal(executeBodies.length, 1, `${args.caseName} should execute exactly once`);
	const payload = executeBodies[0];
	assert.equal(
		payload.connected_account_id as string | undefined,
		args.expectedConnectedAccountId,
		`${args.caseName} selected connected_account_id`,
	);
}

test('executeTool chooses account by header > registry > env > none', async () => {
	await runExecuteCase({
		caseName: 'header',
		envConnected: 'ca-env',
		connectedAccounts: [{ id: 'ca-registry', status: 'ACTIVE', toolkit: { slug: 'gmail' }, user_id: 'u1' }],
		executeOptions: { connectedAccountId: 'ca-header' },
		expectedConnectedAccountId: 'ca-header',
	});

	await runExecuteCase({
		caseName: 'registry',
		envConnected: 'ca-env',
		connectedAccounts: [{ id: 'ca-registry', status: 'ACTIVE', toolkit: { slug: 'gmail' }, user_id: 'u1' }],
		expectedConnectedAccountId: 'ca-registry',
	});

	await runExecuteCase({
		caseName: 'env',
		envConnected: 'ca-env',
		connectedAccounts: [],
		expectedConnectedAccountId: 'ca-env',
	});

	await runExecuteCase({
		caseName: 'none',
		envConnected: undefined,
		connectedAccounts: [],
		expectedConnectedAccountId: undefined,
	});
});

test('registry ranking prefers active, entity-matching, and newer account', async () => {
	await runExecuteCase({
		caseName: 'ranking',
		envConnected: undefined,
		connectedAccounts: [
			{
				id: 'ca-other-entity',
				status: 'ACTIVE',
				toolkit: { slug: 'gmail' },
				user_id: 'u2',
				updated_at: '2026-05-07T13:00:00Z',
			},
			{
				id: 'ca-u1-new',
				status: 'ACTIVE',
				toolkit: { slug: 'gmail' },
				user_id: 'u1',
				updated_at: '2026-05-07T12:00:00Z',
			},
			{
				id: 'ca-u1-old',
				status: 'ACTIVE',
				toolkit: { slug: 'gmail' },
				user_id: 'u1',
				updated_at: '2026-05-07T10:00:00Z',
			},
			{
				id: 'ca-u1-inactive',
				status: 'INITIATED',
				toolkit: { slug: 'gmail' },
				user_id: 'u1',
				updated_at: '2026-05-07T14:00:00Z',
			},
		],
		executeOptions: { entityId: 'u1' },
		expectedConnectedAccountId: 'ca-u1-new',
	});
});
