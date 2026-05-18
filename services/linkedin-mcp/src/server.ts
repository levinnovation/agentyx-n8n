import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { searchLinkedIn } from './searcher.js';
import { logLine } from './logger.js';
import type { SearchRequest } from './types.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? '';

// ─── Startup validation ───────────────────────────────────────────────────────

logLine('info', 'startup', { port: PORT, has_auth_token: !!MCP_AUTH_TOKEN, node_env: process.env.NODE_ENV });

if (!MCP_AUTH_TOKEN) {
	logLine('warn', 'missing_required_env', { name: 'MCP_AUTH_TOKEN' });
	// Do NOT exit — Railway needs the health endpoint up to debug variables.
	// Auth middleware will reject all non-health requests with 401.
}

// ─── Middleware ───────────────────────────────────────────────────────────────

function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
	const incoming = req.headers['x-request-id'];
	const cid =
		typeof incoming === 'string' && incoming.length > 0 && incoming.length < 200
			? incoming
			: randomUUID();
	(req as Request & { correlationId: string }).correlationId = cid;
	res.setHeader('x-request-id', cid);
	next();
}

function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
	if (req.path === '/healthz') return next();
	if (!MCP_AUTH_TOKEN) {
		res.status(503).json({ error: 'server_misconfigured', detail: 'MCP_AUTH_TOKEN not set' });
		return;
	}
	const auth = req.headers.authorization;
	if (!auth || auth !== `Bearer ${MCP_AUTH_TOKEN}`) {
		res.status(401).json({ error: 'unauthorized' });
		return;
	}
	next();
}

// ─── MCP server factory ───────────────────────────────────────────────────────

function buildMcpServer(): Server {
	const server = new Server(
		{ name: 'linkedin-mcp', version: '1.0.0' },
		{ capabilities: { tools: {} } },
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: [
			{
				name: 'search_linkedin_people',
				description:
					'Search LinkedIn for people profiles matching a query. Returns a list of profiles with name, title, company, LinkedIn URL, and location.',
				inputSchema: {
					type: 'object' as const,
					properties: {
						query: {
							type: 'string',
							description:
								'Search query, e.g. "operations manager ai automation latam"',
						},
						limit: {
							type: 'number',
							description: 'Maximum number of profiles to return (default 10, max 25)',
						},
					},
					required: ['query'],
				},
			},
		],
	}));

	server.setRequestHandler(CallToolRequestSchema, async (req) => {
		const { name, arguments: args } = req.params;

		if (name !== 'search_linkedin_people') {
			return {
				content: [{ type: 'text' as const, text: JSON.stringify({ error: 'unknown_tool', tool: name }) }],
				isError: true,
			};
		}

		const query = String((args as Record<string, unknown>)?.query ?? '').trim();
		const limit = Math.min(Math.max(1, Number((args as Record<string, unknown>)?.limit ?? 10)), 25);

		if (!query) {
			return {
				content: [{ type: 'text' as const, text: JSON.stringify({ error: 'query_required' }) }],
				isError: true,
			};
		}

		try {
			const { profiles, source } = await searchLinkedIn(query, limit);
			logLine('info', 'mcp_tool_search', { query, limit, found: profiles.length, source });
			return {
				content: [
					{
						type: 'text' as const,
						text: JSON.stringify({ profiles, count: profiles.length, source }),
					},
				],
			};
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logLine('error', 'mcp_tool_search_error', { query, error: msg });
			return {
				content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }],
				isError: true,
			};
		}
	});

	return server;
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.disable('x-powered-by');
app.use(correlationIdMiddleware);
app.use(express.json({ limit: '1mb' }));

// Health check (no auth)
app.get('/healthz', (_req, res) => {
	res.json({ ok: true, service: 'linkedin-mcp' });
});

app.use(bearerAuthMiddleware);

// ─── REST endpoint: called directly by n8n HTTP Request node ─────────────────
// Returns { data: [...] } — matches the shape that Normalize Leads expects

app.post('/api/search', async (req: Request, res: Response) => {
	const body = req.body as SearchRequest;
	const query = String(body?.query ?? '').trim();
	const limit = Math.min(Math.max(1, Number(body?.limit ?? 25)), 50);

	if (!query) {
		res.status(400).json({ error: 'query_required' });
		return;
	}

	try {
		const { profiles, source } = await searchLinkedIn(query, limit);
		logLine('info', 'rest_search', {
			query,
			limit,
			found: profiles.length,
			source,
			cid: (req as Request & { correlationId: string }).correlationId,
		});
		res.json({ data: profiles, count: profiles.length, source, query });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logLine('error', 'rest_search_error', { query, error: msg });
		res.status(502).json({ error: 'search_failed', detail: msg });
	}
});

// ─── MCP endpoint: called by n8n mcpClientTool node or AI agents ─────────────

app.post('/mcp', async (req: Request, res: Response) => {
	const transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});

	// Bind response lifecycle
	res.on('close', () => {
		void transport.close();
	});

	try {
		const server = buildMcpServer();
		await server.connect(transport);
		await transport.handleRequest(req, res, req.body as Record<string, unknown>);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		logLine('error', 'mcp_request_error', { error: msg });
		if (!res.headersSent) {
			res.status(500).json({ error: 'internal_error' });
		}
	}
});

app.get('/mcp', (_req, res) => res.status(405).json({ error: 'method_not_allowed' }));
app.delete('/mcp', (_req, res) => res.status(405).json({ error: 'method_not_allowed' }));

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
	logLine('info', 'server_started', { port: PORT, host: '0.0.0.0', timestamp: new Date().toISOString() });
});

export default app;
