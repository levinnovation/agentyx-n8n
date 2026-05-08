import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { ComposioClient } from './composio.js';
import { logLine } from './logger.js';
import { inputParametersToJsonSchema } from './schema-utils.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY ?? '';
const COMPOSIO_API_BASE =
	process.env.COMPOSIO_API_BASE ?? 'https://backend.composio.dev/api/v3.1';
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? '';

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
	return new ComposioClient(COMPOSIO_API_KEY, COMPOSIO_API_BASE);
}

interface McpRequestContext {
	preferredCategories?: string[];
	maxTools?: number;
}

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
			});
			logLine('info', 'mcp_list_tools', {
				correlationId,
				toolCount: tools.length,
				durationMs: Date.now() - t0,
			});
			return {
				tools: tools.map((t) => ({
					name: t.slug,
					description:
						t.description ||
						t.human_description ||
						t.name ||
						`Composio tool ${t.slug}`,
					inputSchema: inputParametersToJsonSchema(t.input_parameters),
				})),
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
			const result = await client.executeTool(name, args as Record<string, unknown>, correlationId);
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

	const mcp = createMcpServer(client, cid, { preferredCategories, maxTools });
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

app.listen(PORT, '0.0.0.0', () => {
	logLine('info', 'server_listen', { port: PORT });
});
