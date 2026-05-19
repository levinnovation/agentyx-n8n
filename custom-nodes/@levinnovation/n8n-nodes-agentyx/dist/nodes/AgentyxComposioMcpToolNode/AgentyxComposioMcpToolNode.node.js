"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentyxComposioMcpToolNode = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class AgentyxComposioMcpToolNode {
    description = {
        displayName: "Agentyx Composio MCP Tool",
        name: "agentyxComposioMcpToolNode",
        icon: "file:AgentyxComposioMcpToolNode.svg",
        group: ["transform"],
        version: 1,
        subtitle: '={{ $parameter["toolkit"] }}',
        description: "Encapsulates MCP Client Tool with Composio headers, toolkit filtering, and auto-account selection",
        defaults: {
            name: "Agentyx Composio MCP",
        },
        inputs: ["main"],
        outputs: ["main"],
        credentials: [
            { name: "composioMcp", required: true },
        ],
        properties: [
            {
                displayName: "Toolkit",
                name: "toolkit",
                type: "options",
                options: [
                    { name: "Google Calendar", value: "GOOGLECALENDAR" },
                    { name: "Google Docs", value: "GOOGLEDOCS" },
                    { name: "Gmail", value: "GMAIL" },
                    { name: "Slack", value: "SLACK" },
                    { name: "ClickUp", value: "CLICKUP" },
                    { name: "Google Drive", value: "GOOGLEDRIVE" },
                    { name: "Tavily", value: "TAVILY" },
                    { name: "Resend", value: "RESEND" },
                    { name: "All (no filter)", value: "ALL" },
                ],
                default: "GOOGLECALENDAR",
                description: "Filter tools by Composio toolkit",
            },
            {
                displayName: "Max Tools",
                name: "maxTools",
                type: "number",
                default: 8,
                description: "Maximum number of tools to expose to the LLM",
            },
            {
                displayName: "Include Tools (JSON Array)",
                name: "includeTools",
                type: "json",
                default: "[]",
                description: "Whitelist specific tool names. Empty array = all tools in toolkit.",
            },
            {
                displayName: "Compressed Tools",
                name: "compressedTools",
                type: "boolean",
                default: true,
                description: "Send x-compressed-tools: 1 header",
            },
            {
                displayName: "Tool Verbosity",
                name: "toolVerbosity",
                type: "options",
                options: [
                    { name: "Brief", value: "brief" },
                    { name: "Full", value: "full" },
                ],
                default: "brief",
            },
            {
                displayName: "Entity ID",
                name: "entityId",
                type: "string",
                default: "={{ $env.COMPOSIO_ENTITY_ID || 'levinnovation-user-id' }}",
                description: "x-entity-id header. Supports expressions.",
            },
            {
                displayName: "User Prompt",
                name: "userPrompt",
                type: "string",
                default: "={{ $json.message || $json.meeting_title || 'default' }}",
                description: "x-user-prompt header. Supports expressions.",
            },
            {
                displayName: "Connected Account ID",
                name: "connectedAccountId",
                type: "string",
                default: "={{ $env.COMPOSIO_CONNECTED_ACCOUNT_ID || '' }}",
                description: "x-connected-account-id header (optional).",
            },
            {
                displayName: "MCP Method",
                name: "method",
                type: "options",
                options: [
                    { name: "tools/list", value: "tools/list" },
                    { name: "tools/call", value: "tools/call" },
                ],
                default: "tools/call",
                description: "MCP JSON-RPC method to invoke",
            },
            {
                displayName: "Tool Name",
                name: "toolName",
                type: "string",
                default: "",
                placeholder: "GOOGLECALENDAR_CREATE_EVENT",
                description: "Required when method = tools/call",
                displayOptions: { show: { method: ["tools/call"] } },
            },
            {
                displayName: "Tool Arguments (JSON)",
                name: "toolArguments",
                type: "json",
                default: "{}",
                description: "Arguments object for the tool call",
                displayOptions: { show: { method: ["tools/call"] } },
            },
            {
                displayName: "Timeout (ms)",
                name: "timeout",
                type: "number",
                default: 30000,
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials("composioMcp");
        const baseUrl = credentials.baseUrl || "https://levinnovation.mcp.agentyx.one/mcp";
        for (let i = 0; i < items.length; i++) {
            const toolkit = this.getNodeParameter("toolkit", i);
            const maxTools = this.getNodeParameter("maxTools", i);
            const includeToolsRaw = this.getNodeParameter("includeTools", i);
            const compressed = this.getNodeParameter("compressedTools", i);
            const verbosity = this.getNodeParameter("toolVerbosity", i);
            const entityId = this.getNodeParameter("entityId", i);
            const userPrompt = this.getNodeParameter("userPrompt", i);
            const connectedAccountId = this.getNodeParameter("connectedAccountId", i);
            const method = this.getNodeParameter("method", i);
            const timeout = this.getNodeParameter("timeout", i);
            let includeTools = [];
            try {
                includeTools = JSON.parse(includeToolsRaw || "[]");
            }
            catch {
                includeTools = [];
            }
            const headers = {
                "Content-Type": "application/json",
                Accept: "application/json",
                "x-entity-id": entityId,
                "x-user-prompt": userPrompt,
                "x-max-tools": String(maxTools),
                "x-tool-verbosity": verbosity,
            };
            if (toolkit && toolkit !== "ALL") {
                headers["x-allowed-toolkits"] = toolkit;
            }
            if (compressed) {
                headers["x-compressed-tools"] = "1";
            }
            if (connectedAccountId) {
                headers["x-connected-account-id"] = connectedAccountId;
            }
            // Load additional auth headers from credential
            let authHeaders = {};
            try {
                authHeaders = JSON.parse(credentials.authHeaders || "{}");
            }
            catch {
                authHeaders = {};
            }
            for (const [k, v] of Object.entries(authHeaders)) {
                headers[k] = String(v);
            }
            const body = {
                jsonrpc: "2.0",
                id: `${Date.now()}-${i}`,
                method,
            };
            if (method === "tools/call") {
                const toolName = this.getNodeParameter("toolName", i);
                const toolArgsRaw = this.getNodeParameter("toolArguments", i);
                let toolArgs = {};
                try {
                    toolArgs = JSON.parse(toolArgsRaw || "{}");
                }
                catch {
                    toolArgs = {};
                }
                if (!toolName) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), "Tool Name is required for tools/call method", { itemIndex: i });
                }
                body.params = {
                    name: toolName,
                    arguments: toolArgs,
                };
            }
            try {
                const response = await this.helpers.request({
                    method: "POST",
                    url: baseUrl,
                    headers,
                    body,
                    json: true,
                    timeout,
                });
                returnData.push({
                    json: {
                        result: response?.result || null,
                        error: response?.error || null,
                        tool: method === "tools/call" ? this.getNodeParameter("toolName", i) : null,
                        toolkit,
                        entity_id: entityId,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            request_id: body.id,
                        },
                    },
                    pairedItem: { item: i },
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Composio MCP request failed: ${msg}`, { itemIndex: i });
            }
        }
        return [returnData];
    }
}
exports.AgentyxComposioMcpToolNode = AgentyxComposioMcpToolNode;
