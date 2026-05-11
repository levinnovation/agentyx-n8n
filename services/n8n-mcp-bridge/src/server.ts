import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { invokeN8nTool } from './n8n-client.js';
import { parseRegistryFromEnv } from './registry.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? '';
const N8N_BRIDGE_SECRET = process.env.N8N_BRIDGE_SECRET ?? '';
const N8N_TOOLS_REGISTRY_JSON = process.env.N8N_TOOLS_REGISTRY_JSON ?? '';
const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL ?? 'https://levinnovation.n8n.agentyx.one/webhook/';
const DYNAMIC_WEBHOOK_TOOL = 'n8n_webhook_call';

function requireEnv(name: string, value: string) {
  if (!value) {
    console.error(JSON.stringify({ level: 'error', msg: 'missing_required_env', name }));
    process.exit(1);
  }
}

requireEnv('MCP_AUTH_TOKEN', MCP_AUTH_TOKEN);
requireEnv('N8N_BRIDGE_SECRET', N8N_BRIDGE_SECRET);
requireEnv('N8N_TOOLS_REGISTRY_JSON', N8N_TOOLS_REGISTRY_JSON);

const registry = parseRegistryFromEnv(N8N_TOOLS_REGISTRY_JSON);
const registryByTool = new Map(registry.map((item) => [item.tool, item] as const));

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

function getCorrelationId(req: Request): string {
  return ((req as Request & { correlationId?: string }).correlationId ?? randomUUID()).toString();
}

function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/healthz') return next();
  if (req.headers.authorization !== `Bearer ${MCP_AUTH_TOKEN}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

function createMcpServer(correlationId: string) {
  const server = new Server(
    { name: 'n8n-mcp-bridge', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...registry.map((item) => ({
          name: item.tool,
          description: item.description,
          inputSchema: item.input_schema,
        })),
        {
          name: DYNAMIC_WEBHOOK_TOOL,
          description:
            'Call any n8n webhook under the configured webhook base URL. Use for invoking arbitrary n8n workflows exposed via webhooks.',
          inputSchema: {
            type: 'object',
            properties: {
              webhook_url: {
                type: 'string',
                description: `Full webhook URL. Must start with ${N8N_WEBHOOK_BASE_URL}`,
              },
              payload: {
                type: 'object',
                description: 'Arbitrary JSON payload sent to the webhook.',
              },
              message: { type: 'string' },
              conversation_id: { type: 'string' },
              user_id: { type: 'string' },
              metadata: { type: 'object' },
            },
            required: ['webhook_url'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args =
      typeof request.params.arguments === 'object' && request.params.arguments !== null
        ? (request.params.arguments as Record<string, unknown>)
        : {};

    if (toolName === DYNAMIC_WEBHOOK_TOOL) {
      const webhookUrl = typeof args.webhook_url === 'string' ? args.webhook_url.trim() : '';
      if (!webhookUrl || !webhookUrl.startsWith(N8N_WEBHOOK_BASE_URL)) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Invalid webhook_url. It must start with ${N8N_WEBHOOK_BASE_URL}`,
            },
          ],
          isError: true,
        };
      }
      const payload =
        typeof args.payload === 'object' && args.payload !== null
          ? (args.payload as Record<string, unknown>)
          : {
              message: typeof args.message === 'string' ? args.message : '',
              conversation_id: typeof args.conversation_id === 'string' ? args.conversation_id : '',
              user_id: typeof args.user_id === 'string' ? args.user_id : '',
              metadata: typeof args.metadata === 'object' && args.metadata !== null ? args.metadata : {},
            };
      const result = await invokeN8nTool({
        webhookUrl,
        bridgeSecret: N8N_BRIDGE_SECRET,
        payload,
        requestId: correlationId,
      });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                ok: result.status >= 200 && result.status < 300,
                status: result.status,
                tool: toolName,
                response: result.parsedBody,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    const item = registryByTool.get(toolName);
    if (!item) {
      return {
        content: [{ type: 'text' as const, text: `Unknown tool: ${toolName}` }],
        isError: true,
      };
    }

    const payload: Record<string, unknown> = {
      message: typeof args.message === 'string' ? args.message : '',
      conversation_id: typeof args.conversation_id === 'string' ? args.conversation_id : '',
      user_id: typeof args.user_id === 'string' ? args.user_id : '',
      metadata: typeof args.metadata === 'object' && args.metadata !== null ? args.metadata : {},
    };

    const result = await invokeN8nTool({
      webhookUrl: item.webhook_url,
      bridgeSecret: N8N_BRIDGE_SECRET,
      payload,
      requestId: correlationId,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              ok: result.status >= 200 && result.status < 300,
              status: result.status,
              tool: toolName,
              response: result.parsedBody,
            },
            null,
            2,
          ),
        },
      ],
    };
  });

  return server;
}

const app = express();
app.disable('x-powered-by');
app.use(correlationIdMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? '1mb' }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, service: 'n8n-mcp-bridge', tools: registry.length });
});

app.use(bearerAuthMiddleware);

app.post('/mcp', async (req, res) => {
  const cid = getCorrelationId(req);
  const mcpServer = createMcpServer(cid);

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      void transport.close();
      void mcpServer.close();
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'mcp_transport_error',
        correlationId: cid,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'server_listen',
      port: PORT,
      tools: registry.map((item) => item.tool),
    }),
  );
});
