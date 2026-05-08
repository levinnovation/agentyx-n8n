import test from 'node:test';
import assert from 'node:assert/strict';

import { ComposioClient, StructuredToolError } from './composio.js';

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

test('listTools with userPrompt narrows to prompt-relevant tools', async () => {
	await withEnv(
		{
			COMPOSIO_SMART_DEFAULT: 'true',
			COMPOSIO_PROMPT_TOPN: '2',
			COMPOSIO_ALLOWED_TOOLKITS: undefined,
			COMPOSIO_ALLOWED_ACTIONS: undefined,
			COMPOSIO_ENTITY_ID: 'u1',
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
								description: 'Send an email using Gmail',
								toolkit: { slug: 'gmail', name: 'Gmail' },
								input_parameters: { type: 'object', properties: {} },
							},
							{
								slug: 'SLACK_SEND_MESSAGE',
								name: 'Send Slack message',
								description: 'Send a message in Slack channel',
								toolkit: { slug: 'slack', name: 'Slack' },
								input_parameters: { type: 'object', properties: {} },
							},
							{
								slug: 'NOTION_CREATE_PAGE',
								name: 'Create Notion page',
								description: 'Create docs in Notion',
								toolkit: { slug: 'notion', name: 'Notion' },
								input_parameters: { type: 'object', properties: {} },
							},
						],
						next_cursor: null,
					});
				}
				if (url.includes('/connected_accounts?')) {
					return jsonResponse({
						items: [{ id: 'ca-gmail', status: 'ACTIVE', toolkit: { slug: 'gmail' }, user_id: 'u1' }],
						next_cursor: null,
					});
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;
			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				const tools = await client.listTools('cid-prompt', { userPrompt: 'send email gmail', entityId: 'u1' });
				assert.equal(tools.length, 2);
				assert.equal(tools[0]?.slug, 'GMAIL_SEND_EMAIL');
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});

test('searchToolsWithComposioFallback uses planner when local misses specific intent', async () => {
	await withEnv(
		{
			COMPOSIO_SEARCH_PLANNER_FALLBACK: 'true',
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
								slug: 'ABSTRACT_EMAIL_REPUTATION_API',
								name: 'Email validation',
								description: 'Validate email quality',
								toolkit: { slug: 'abstract', name: 'Abstract' },
								input_parameters: { type: 'object', properties: {} },
							},
						],
						next_cursor: null,
					});
				}
				if (url.includes('/connected_accounts?')) {
					return jsonResponse({ items: [], next_cursor: null });
				}
				if (url.includes('/tools/execute/COMPOSIO_SEARCH_TOOLS')) {
					assert.equal(init?.method, 'POST');
					return jsonResponse({
						data: {
							tool_schemas: {
								GMAIL_SEND_EMAIL: { description: 'send email' },
							},
						},
						successful: true,
					});
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;
			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				const search = await client.searchToolsWithComposioFallback('cid-search-fallback', 'send email gmail', 5);
				assert.equal(search.source, 'composio');
				assert.equal(search.tools[0]?.slug, 'GMAIL_SEND_EMAIL');
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});

test('searchToolsWithComposioFallback keeps local results when local matches intent', async () => {
	await withEnv(
		{
			COMPOSIO_SEARCH_PLANNER_FALLBACK: 'true',
			COMPOSIO_SMART_DEFAULT: 'true',
		},
		async () => {
			const originalFetch = global.fetch;
			let plannerCalls = 0;
			global.fetch = (async (input: string | URL | Request) => {
				const url = String(input instanceof Request ? input.url : input);
				if (url.includes('/tools?')) {
					return jsonResponse({
						items: [
							{
								slug: 'GMAIL_SEND_EMAIL',
								name: 'Send Gmail',
								description: 'Send email via gmail',
								toolkit: { slug: 'gmail', name: 'Gmail' },
								input_parameters: { type: 'object', properties: {} },
							},
						],
						next_cursor: null,
					});
				}
				if (url.includes('/connected_accounts?')) {
					return jsonResponse({ items: [], next_cursor: null });
				}
				if (url.includes('/tools/execute/COMPOSIO_SEARCH_TOOLS')) {
					plannerCalls += 1;
					return jsonResponse({ data: { tool_schemas: {} }, successful: true });
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;
			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				const search = await client.searchToolsWithComposioFallback('cid-search-local', 'send email gmail', 5);
				assert.equal(search.source, 'local');
				assert.equal(search.tools[0]?.slug, 'GMAIL_SEND_EMAIL');
				assert.equal(plannerCalls, 0);
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});

test('initiateConnectedAccount supports oauth and api-key schemes', async () => {
	await withEnv(
		{
			COMPOSIO_AUTO_CONNECT_TOOLKITS: 'gmail,stripe',
			COMPOSIO_ENTITY_ID: 'u1',
		},
		async () => {
			const postedBodies: JsonBody[] = [];
			const originalFetch = global.fetch;
			global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
				const url = String(input instanceof Request ? input.url : input);
				if (url.includes('/auth_configs?toolkit_slug=gmail')) {
					return jsonResponse({
						items: [{ id: 'ac-gmail', status: 'ACTIVE', auth_scheme: 'OAUTH2' }],
					});
				}
				if (url.includes('/auth_configs?toolkit_slug=stripe')) {
					return jsonResponse({
						items: [{ id: 'ac-stripe', status: 'ACTIVE', auth_scheme: 'API_KEY' }],
					});
				}
				if (url.includes('/connected_accounts?')) {
					return jsonResponse({ items: [], next_cursor: null });
				}
				if (url.endsWith('/connected_accounts') && init?.method === 'POST') {
					if (!init.body || typeof init.body !== 'string') throw new Error('missing body');
					const body = JSON.parse(init.body) as JsonBody;
					postedBodies.push(body);
					const authConfigId = (body.auth_config as { id?: string } | undefined)?.id;
					if (authConfigId === 'ac-gmail') {
						return jsonResponse({ id: 'ca-gmail', status: 'INITIATED', redirect_url: 'https://oauth.example' });
					}
					return jsonResponse({ id: 'ca-stripe', status: 'ACTIVE' });
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;
			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				const oauth = await client.initiateConnectedAccount({ toolkit: 'gmail' }, 'cid-oauth');
				assert.equal(oauth.connectedAccountId, 'ca-gmail');
				assert.equal(oauth.redirectUrl, 'https://oauth.example');

				const apiKey = await client.initiateConnectedAccount(
					{ toolkit: 'stripe', credentials: { api_key: 'secret' } },
					'cid-apikey',
				);
				assert.equal(apiKey.connectedAccountId, 'ca-stripe');
				assert.equal(apiKey.status, 'ACTIVE');
				assert.equal(postedBodies.length, 2);
				assert.equal((postedBodies[1]?.connection as { api_key?: string })?.api_key, 'secret');
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});

test('initiateConnectedAccount denies toolkits outside auto-connect allowlist', async () => {
	await withEnv(
		{
			COMPOSIO_AUTO_CONNECT_TOOLKITS: 'gmail',
			COMPOSIO_ENTITY_ID: 'u1',
		},
		async () => {
			const originalFetch = global.fetch;
			let called = false;
			global.fetch = (async () => {
				called = true;
				return jsonResponse({});
			}) as typeof global.fetch;
			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				await assert.rejects(
					() => client.initiateConnectedAccount({ toolkit: 'stripe' }, 'cid-deny'),
					/auto_connect_not_allowed/,
				);
				assert.equal(called, false);
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});

test('executeTool implicit fallback returns structured missing_connection error', async () => {
	await withEnv(
		{
			COMPOSIO_ENTITY_ID: 'u1',
			COMPOSIO_SMART_DEFAULT: 'true',
			COMPOSIO_AUTO_CONNECT_TOOLKITS: 'gmail',
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
					return jsonResponse({ items: [], next_cursor: null });
				}
				if (url.includes('/tools/execute/')) {
					return jsonResponse({ error: 'no connected account for toolkit gmail' }, 400);
				}
				if (url.includes('/auth_configs?toolkit_slug=gmail')) {
					return jsonResponse({ items: [{ id: 'ac-gmail', status: 'ACTIVE', auth_scheme: 'OAUTH2' }] });
				}
				if (url.endsWith('/connected_accounts') && init?.method === 'POST') {
					return jsonResponse({
						id: 'ca-new-gmail',
						status: 'INITIATED',
						redirect_url: 'https://oauth.example/connect',
					});
				}
				throw new Error(`Unexpected URL: ${url}`);
			}) as typeof global.fetch;
			try {
				const client = new ComposioClient('test-key', 'https://backend.composio.dev/api/v3.1');
				await assert.rejects(
					() => client.executeTool('GMAIL_SEND_EMAIL', { to: 'a@example.com' }, 'cid-fallback'),
					(error: unknown) => {
						assert.ok(error instanceof StructuredToolError);
						assert.equal((error as StructuredToolError).payload.kind, 'missing_connection');
						assert.equal(
							(error as StructuredToolError).payload.redirect_url,
							'https://oauth.example/connect',
						);
						return true;
					},
				);
			} finally {
				global.fetch = originalFetch;
			}
		},
	);
});
