import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ComposioClient, StructuredToolError } from './composio.js';
import { logLine } from './logger.js';
import { inputParametersToJsonSchema } from './schema-utils.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY ?? '';
const COMPOSIO_API_BASE =
	process.env.COMPOSIO_API_BASE ?? 'https://backend.composio.dev/api/v3.1';
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? '';
let composioClient: ComposioClient | null = null;

function requireEnv(name: string, value: string) {
	if (!value) {
		logLine('error', 'missing_required_env', { name });
		process.exit(1);
	}
}

function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
	const incoming = req.headers['x-request-id'];
	const cid =
		(typeof incoming === 'string' && incoming.length > 0 && incoming.length < 200
			? incoming
			: randomUUID()) ?? randomUUID();
	(req as Request & { correlationId: string }).correlationId = cid;
	res.setHeader('x-request-id', cid);
	next();
}

function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
	if (req.path === '/healthz') return next();
	const expected = MCP_AUTH_TOKEN;
	const auth = req.headers.authorization;
	if (!expected) {
		res.status(503).json({ error: 'server_misconfigured', detail: 'MCP_AUTH_TOKEN not set' });
		return;
	}
	if (!auth || auth !== `Bearer ${expected}`) {
		res.status(401).json({ error: 'unauthorized' });
		return;
	}
	next();
}

function getComposioClient(): ComposioClient {
	if (!composioClient) {
		composioClient = new ComposioClient(COMPOSIO_API_KEY, COMPOSIO_API_BASE);
	}
	return composioClient;
}

function normalizeListFromEnv(value?: string): string[] {
	return (value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function hasExplicitAllowlistConfigured(): boolean {
	return (
		normalizeListFromEnv(process.env.COMPOSIO_ALLOWED_TOOLKITS).length > 0 ||
		normalizeListFromEnv(process.env.COMPOSIO_ALLOWED_ACTIONS).length > 0
	);
}

function getAutoConnectAllowlist(): Set<string> {
	return new Set(
		normalizeListFromEnv(process.env.COMPOSIO_AUTO_CONNECT_TOOLKITS).map((item) => item.toLowerCase()),
	);
}

function getMetaTools(): MetaToolDescriptor[] {
	if (hasExplicitAllowlistConfigured()) return [];
	const base = [SEARCH_META_TOOL, EXECUTE_META_TOOL];
	if (getAutoConnectAllowlist().size > 0) {
		base.push(INITIATE_CONNECTION_META_TOOL, CHECK_CONNECTION_META_TOOL);
	}
	return base;
}

function extractUserPrompt(req: Request, body: unknown): string | undefined {
	const cap = 4000;
	const header = req.headers['x-user-prompt'];
	if (typeof header === 'string') {
		const trimmed = header.trim();
		if (trimmed) return trimmed.slice(0, cap);
	}
	if (Array.isArray(header)) {
		const first = header.find((value) => value.trim().length > 0);
		if (first) return first.trim().slice(0, cap);
	}
	if (typeof body !== 'object' || body === null) return undefined;
	const params = (body as { params?: unknown }).params;
	if (typeof params !== 'object' || params === null) return undefined;
	const meta = (params as { _meta?: unknown })._meta;
	if (typeof meta !== 'object' || meta === null) return undefined;
	const direct = (meta as { userPrompt?: unknown }).userPrompt;
	if (typeof direct === 'string' && direct.trim()) return direct.trim().slice(0, cap);
	const alternative = (meta as { 'x-user-prompt'?: unknown })['x-user-prompt'];
	if (typeof alternative === 'string' && alternative.trim()) return alternative.trim().slice(0, cap);
	return undefined;
}

interface McpRequestContext {
	preferredCategories?: string[];
	maxTools?: number;
	entityId?: string;
	connectedAccountId?: string;
	userPrompt?: string;
	allowedToolkits?: string[];
	compressedToolsMode?: boolean;
	compressedVerbosity?: 'none' | 'minimal' | 'brief';
}

interface MetaToolDescriptor {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

const SEARCH_META_TOOL: MetaToolDescriptor = {
	name: 'composio_search_tools',
	description:
		'Search the full Composio tool catalog by natural-language query and return matching slugs with JSON Schemas.',
	inputSchema: {
		type: 'object',
		properties: {
			query: { type: 'string' },
			max_results: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
		},
		required: ['query'],
	},
};

const EXECUTE_META_TOOL: MetaToolDescriptor = {
	name: 'composio_execute_tool',
	description: 'Execute any Composio tool by slug after discovering it via composio_search_tools.',
	inputSchema: {
		type: 'object',
		properties: {
			slug: { type: 'string' },
			arguments: { type: 'object' },
		},
		required: ['slug'],
	},
};

const INITIATE_CONNECTION_META_TOOL: MetaToolDescriptor = {
	name: 'composio_initiate_connection',
	description:
		'Start Composio connected-account creation for a toolkit. OAuth returns redirect_url; API-key toolkits accept credentials object.',
	inputSchema: {
		type: 'object',
		properties: {
			toolkit: { type: 'string' },
			credentials: { type: 'object' },
		},
		required: ['toolkit'],
	},
};

const CHECK_CONNECTION_META_TOOL: MetaToolDescriptor = {
	name: 'composio_check_connection',
	description: 'Check status of a previously initiated Composio connected account.',
	inputSchema: {
		type: 'object',
		properties: {
			connected_account_id: { type: 'string' },
		},
		required: ['connected_account_id'],
	},
};

const GET_TOOL_SCHEMA_META_TOOL: MetaToolDescriptor = {
	name: 'composio_get_tool_schema',
	description: 'Fetch the full JSON schema and metadata for one tool slug on demand.',
	inputSchema: {
		type: 'object',
		properties: {
			slug: { type: 'string' },
		},
		required: ['slug'],
	},
};

const LIST_TOOLS_META_TOOL: MetaToolDescriptor = {
	name: 'composio_list_tools',
	description: 'List available Composio tools with compact metadata for discovery.',
	inputSchema: {
		type: 'object',
		properties: {
			max_results: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
		},
	},
};

function createMcpServer(client: ComposioClient, correlationId: string, ctx?: McpRequestContext) {
	const server = new Server(
		{ name: 'composio-mcp', version: '1.0.0' },
		{ capabilities: { tools: {}, logging: {} } },
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		const t0 = Date.now();
		try {
			const tools = await client.listTools(correlationId, {
				preferredCategories: ctx?.preferredCategories,
				maxTools: ctx?.maxTools,
				entityId: ctx?.entityId,
				userPrompt: ctx?.userPrompt,
			});
			const toolkitFilter = new Set((ctx?.allowedToolkits ?? []).map((k) => k.toLowerCase()));
			const filteredTools =
				toolkitFilter.size > 0
					? tools.filter((t) => toolkitFilter.has(String(t.toolkit?.slug ?? '').toLowerCase()))
					: tools;
			const metaTools = getMetaTools();
			const boundedTools =
				ctx?.maxTools && ctx.maxTools > 0 && metaTools.length > 0
					? filteredTools.slice(0, Math.max(ctx.maxTools - metaTools.length, 1))
					: filteredTools;
			let formattedTools;
			if (ctx?.compressedToolsMode) {
				const verbosity = ctx.compressedVerbosity ?? 'brief';
				formattedTools = boundedTools.map((t) => {
					const toolkit = String(t.toolkit?.slug ?? '').toLowerCase();
					const descriptionBase = t.description || t.human_description || t.name || `Composio tool ${t.slug}`;
					let description = `Toolkit:${toolkit || 'unknown'}`;
					if (verbosity === 'brief') {
						description = `${description} | ${descriptionBase.slice(0, 140)}`;
					}
					return {
						name: t.slug,
						description,
						inputSchema:
							verbosity === 'none'
								? { type: 'object', properties: {} }
								: inputParametersToJsonSchema(t.input_parameters),
					};
				});
				formattedTools = [
					LIST_TOOLS_META_TOOL,
					GET_TOOL_SCHEMA_META_TOOL,
					EXECUTE_META_TOOL,
					...formattedTools,
				];
			} else {
				formattedTools = boundedTools.map((t) => ({
					name: t.slug,
					description: t.description || t.human_description || t.name || `Composio tool ${t.slug}`,
					inputSchema: inputParametersToJsonSchema(t.input_parameters),
				}));
			}
			logLine('info', 'mcp_list_tools', {
				correlationId,
				toolCount: formattedTools.length + metaTools.length,
				durationMs: Date.now() - t0,
			});
			return {
				tools: [
					...metaTools,
					...formattedTools,
				],
			};
		} catch (e) {
			logLine('error', 'mcp_list_tools_failed', {
				correlationId,
				durationMs: Date.now() - t0,
				error: e instanceof Error ? e.message : String(e),
			});
			throw e;
		}
	});

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const name = request.params.name;
		const args = request.params.arguments ?? {};
		const t0 = Date.now();

		const allowedSlugs = new Set(
			process.env.COMPOSIO_ALLOWED_ACTIONS?.split(',')
				.map((s) => s.trim())
				.filter(Boolean) ?? [],
		);
		if (allowedSlugs.size > 0 && !allowedSlugs.has(name)) {
			logLine('warn', 'mcp_tool_forbidden', { correlationId, name });
			return {
				content: [{ type: 'text' as const, text: `Tool not allowed: ${name}` }],
				isError: true,
			};
		}

		try {
			let result: unknown;
			if (name === 'composio_list_tools') {
				const maxResultsRaw = Number(args.max_results ?? ctx?.maxTools ?? 25);
				const maxResults = Math.max(1, Math.min(Number.isFinite(maxResultsRaw) ? maxResultsRaw : 25, 100));
				const tools = await client.listTools(correlationId, {
					preferredCategories: ctx?.preferredCategories,
					maxTools: maxResults,
					entityId: ctx?.entityId,
					userPrompt: ctx?.userPrompt,
				});
				const toolkitFilter = new Set((ctx?.allowedToolkits ?? []).map((k) => k.toLowerCase()));
				result = (toolkitFilter.size > 0
					? tools.filter((t) => toolkitFilter.has(String(t.toolkit?.slug ?? '').toLowerCase()))
					: tools
				).slice(0, maxResults).map((tool) => ({
					slug: tool.slug,
					toolkit: tool.toolkit?.slug ?? null,
					description: (tool.description || tool.human_description || '').slice(0, 180),
				}));
			} else if (name === 'composio_get_tool_schema') {
				const slug = typeof args.slug === 'string' ? args.slug.trim().toUpperCase() : '';
				if (!slug) throw new Error('slug is required');
				const schema = await client.getToolSchema(correlationId, slug);
				result = schema;
			} else
			if (name === 'composio_search_tools') {
				const query = typeof args.query === 'string' ? args.query.trim() : '';
				if (!query) throw new Error('query is required');
				const maxResultsRaw = Number(args.max_results ?? 10);
				const maxResults = Math.max(1, Math.min(Number.isFinite(maxResultsRaw) ? maxResultsRaw : 10, 50));
				const search = await client.searchToolsWithComposioFallback(correlationId, query, maxResults);
				const tools = search.tools;
				result = tools.map((tool) => ({
					slug: tool.slug,
					name: tool.name,
					description: tool.description || tool.human_description || '',
					toolkit: tool.toolkit?.slug ?? null,
					inputSchema: inputParametersToJsonSchema(tool.input_parameters),
					search_source: search.source,
				}));
			} else if (name === 'composio_execute_tool') {
				const slug = typeof args.slug === 'string' ? args.slug.trim() : '';
				if (!/^[A-Z0-9_]+$/.test(slug)) {
					throw new Error('slug must be uppercase + underscores');
				}
				const invokeArgs =
					typeof args.arguments === 'object' && args.arguments !== null
						? (args.arguments as Record<string, unknown>)
						: {};
				result = await client.executeTool(slug, invokeArgs, correlationId, {
					entityId: ctx?.entityId,
					connectedAccountId: ctx?.connectedAccountId,
					userPrompt: ctx?.userPrompt,
				});
			} else if (name === 'composio_initiate_connection') {
				const toolkit = typeof args.toolkit === 'string' ? args.toolkit.trim() : '';
				if (!toolkit) throw new Error('toolkit is required');
				const credentials =
					typeof args.credentials === 'object' && args.credentials !== null
						? (args.credentials as Record<string, unknown>)
						: undefined;
				const initiated = await client.initiateConnectedAccount(
					{ toolkit, credentials, entityId: ctx?.entityId },
					correlationId,
				);
				result = initiated.redirectUrl
					? {
							kind: 'oauth_connection_required',
							toolkit: initiated.toolkit,
							connected_account_id: initiated.connectedAccountId,
							redirect_url: initiated.redirectUrl,
							message: `OAuth required. Open this URL to connect ${initiated.toolkit}, then retry.`,
						}
					: {
							kind: 'connection_ready',
							toolkit: initiated.toolkit,
							connected_account_id: initiated.connectedAccountId,
							status: initiated.status,
							message: `${initiated.toolkit} connected. You can retry now.`,
						};
			} else if (name === 'composio_check_connection') {
				const id = typeof args.connected_account_id === 'string' ? args.connected_account_id.trim() : '';
				if (!id) throw new Error('connected_account_id is required');
				result = await client.getConnectedAccountStatus(correlationId, id);
			} else {
				result = await client.executeTool(name, args as Record<string, unknown>, correlationId, {
					entityId: ctx?.entityId,
					connectedAccountId: ctx?.connectedAccountId,
					userPrompt: ctx?.userPrompt,
				});
			}
			logLine('info', 'mcp_tool_ok', {
				correlationId,
				name,
				durationMs: Date.now() - t0,
			});
			return {
				content: [
					{
						type: 'text' as const,
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (e) {
			if (e instanceof StructuredToolError) {
				logLine('warn', 'mcp_tool_structured_error', {
					correlationId,
					name,
					durationMs: Date.now() - t0,
					kind: e.payload.kind ?? 'unknown',
				});
				return {
					content: [{ type: 'text' as const, text: JSON.stringify(e.payload, null, 2) }],
					isError: true,
				};
			}
			const msg = e instanceof Error ? e.message : String(e);
			logLine('error', 'mcp_tool_failed', {
				correlationId,
				name,
				durationMs: Date.now() - t0,
				error: msg,
			});
			return {
				content: [{ type: 'text' as const, text: `Error: ${msg}` }],
				isError: true,
			};
		}
	});

	return server;
}

requireEnv('COMPOSIO_API_KEY', COMPOSIO_API_KEY);
requireEnv('MCP_AUTH_TOKEN', MCP_AUTH_TOKEN);

const app = express();
app.disable('x-powered-by');
app.use(correlationIdMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '2mb' }));

app.get('/healthz', (_req, res) => {
	res.status(200).json({ ok: true, service: 'composio-mcp' });
});

app.use(bearerAuthMiddleware);

app.post('/search-tools', async (req, res) => {
	const cid = (req as Request & { correlationId: string }).correlationId;
	const query = typeof req.body?.query === 'string' ? req.body.query : '';
	const maxResults = Math.min(
		Math.max(parseInt(req.body?.max_results ?? '25', 10), 1),
		100,
	);

	if (!query || query.trim().length === 0) {
		res.status(400).json({ error: 'missing_query', detail: 'Request body must include a "query" string' });
		return;
	}

	try {
		const client = getComposioClient();
		const tools = await client.searchTools(cid, query.trim(), maxResults);
		res.status(200).json({
			query: query.trim(),
			results: tools.length,
			tools: tools.map((t) => ({
				slug: t.slug,
				name: t.name,
				description: t.description || t.human_description || '',
				toolkit: t.toolkit?.slug ?? null,
			})),
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		logLine('error', 'search_tools_failed', { correlationId: cid, query, error: msg });
		res.status(500).json({ error: 'search_failed', detail: msg });
	}
});

app.post('/mcp', async (req, res) => {
	const cid = (req as Request & { correlationId: string }).correlationId;
	const client = getComposioClient();

	// Parse request-level control headers
	const catsHeader = req.headers['x-preferred-categories'];
	const preferredCategories = typeof catsHeader === 'string'
		? catsHeader.split(',').map((s) => s.trim()).filter(Boolean)
		: undefined;
	const maxHeader = req.headers['x-max-tools'];
	const maxTools = typeof maxHeader === 'string'
		? parseInt(maxHeader, 10)
		: undefined;
	const entityHeader = req.headers['x-entity-id'];
	const entityId = typeof entityHeader === 'string' && entityHeader.trim() ? entityHeader.trim() : undefined;
	const accountHeader = req.headers['x-connected-account-id'];
	const connectedAccountId =
		typeof accountHeader === 'string' && accountHeader.trim() ? accountHeader.trim() : undefined;
	const userPrompt = extractUserPrompt(req, req.body);
	const toolkitsHeader = req.headers['x-allowed-toolkits'];
	const toolkitsQueryParam = req.query['toolkits'];
	const allowedToolkits =
		typeof toolkitsHeader === 'string'
			? toolkitsHeader.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
			: Array.isArray(toolkitsHeader)
				? toolkitsHeader.flatMap((item) => item.split(',').map((s) => s.trim().toLowerCase())).filter(Boolean)
				: typeof toolkitsQueryParam === 'string'
					? toolkitsQueryParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
					: [];
	const compressedHeader = req.headers['x-compressed-tools'];
	const compressedToolsMode =
		typeof compressedHeader === 'string'
			? ['1', 'true', 'yes'].includes(compressedHeader.toLowerCase())
			: false;
	const verbosityHeader = req.headers['x-tool-verbosity'];
	const compressedVerbosity =
		typeof verbosityHeader === 'string' && ['none', 'minimal', 'brief'].includes(verbosityHeader.toLowerCase())
			? (verbosityHeader.toLowerCase() as 'none' | 'minimal' | 'brief')
			: 'brief';

	const mcp = createMcpServer(client, cid, {
		preferredCategories,
		maxTools,
		entityId,
		connectedAccountId,
		userPrompt,
		allowedToolkits,
		compressedToolsMode,
		compressedVerbosity,
	});
	try {
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		});
		await mcp.connect(transport);
		await transport.handleRequest(req, res, req.body);
		res.on('close', () => {
			void transport.close();
			void mcp.close();
		});
	} catch (error) {
		logLine('error', 'mcp_transport_error', {
			correlationId: cid,
			error: error instanceof Error ? error.message : String(error),
		});
		if (!res.headersSent) {
			res.status(500).json({
				jsonrpc: '2.0',
				error: { code: -32603, message: 'Internal server error' },
				id: null,
			});
		}
	}
});

app.get('/accounts', async (req, res) => {
	const cid = (req as Request & { correlationId: string }).correlationId;
	const client = getComposioClient();
	const refresh = req.query.refresh === '1' || req.query.refresh === 'true';
	const queryEntity = typeof req.query.entity_id === 'string' ? req.query.entity_id.trim() : '';
	const headerEntity = typeof req.headers['x-entity-id'] === 'string' ? req.headers['x-entity-id'].trim() : '';
	const entityId = queryEntity || headerEntity || undefined;

	try {
		const debug = await client.getConnectedAccountsDebug(cid, {
			entityId,
			forceRefresh: refresh,
		});
		res.status(200).json(debug);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		logLine('error', 'accounts_debug_failed', { correlationId: cid, error: msg });
		res.status(500).json({ error: 'accounts_debug_failed', detail: msg });
	}
});

app.get('/mcp', (_req, res) => {
	res.writeHead(405).end(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code: -32000, message: 'Method not allowed' },
			id: null,
		}),
	);
});

app.delete('/mcp', (_req, res) => {
	res.writeHead(405).end(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code: -32000, message: 'Method not allowed' },
			id: null,
		}),
	);
});

// Per-toolkit sub-paths — each endpoint pre-sets allowedToolkits so n8n MCP nodes
// can use a single httpHeaderAuth credential (Bearer token only) per node, one per app.
// e.g. /mcp/gmail  →  only Gmail tools
//      /mcp/googlecalendar  →  only Google Calendar tools
const TOOLKIT_ROUTE_MAP: Record<string, string[]> = {
	gmail:           ['gmail'],
	googlecalendar:  ['googlecalendar'],
	googledrive:     ['googledrive'],
	googlesheets:    ['googlesheets'],
	googledocs:      ['googledocs'],
	slack:           ['slack'],
	tavily:          ['tavily'],
	clickup:         ['clickup'],
	facebook:        ['facebook'],
};

for (const [slug, toolkits] of Object.entries(TOOLKIT_ROUTE_MAP)) {
	app.post(`/mcp/${slug}`, async (req, res) => {
		const cid = (req as Request & { correlationId: string }).correlationId;
		const client = getComposioClient();
		// Merge per-route toolkit filter with any optional request-level override
		const reqToolkitsHeader = req.headers['x-allowed-toolkits'];
		const reqToolkits: string[] =
			typeof reqToolkitsHeader === 'string'
				? reqToolkitsHeader.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
				: [];
		// Route-level toolkits take priority; request header can further narrow but not expand
		const allowedToolkits = reqToolkits.length > 0
			? toolkits.filter((t) => reqToolkits.includes(t))
			: toolkits;

		const mcp = createMcpServer(client, cid, { allowedToolkits });
		try {
			const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
			await mcp.connect(transport);
			await transport.handleRequest(req, res, req.body);
			res.on('close', () => {
				void transport.close();
				void mcp.close();
			});
		} catch (error) {
			logLine('error', 'mcp_toolkit_transport_error', {
				correlationId: cid,
				toolkit: slug,
				error: error instanceof Error ? error.message : String(error),
			});
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: { code: -32603, message: 'Internal server error' },
					id: null,
				});
			}
		}
	});

	app.get(`/mcp/${slug}`, (_req, res) => {
		res.writeHead(405).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }));
	});
}

app.listen(PORT, '0.0.0.0', () => {
	logLine('info', 'server_listen', { port: PORT });
});
