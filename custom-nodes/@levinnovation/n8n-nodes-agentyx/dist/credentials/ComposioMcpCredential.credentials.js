"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposioMcpCredential = void 0;
class ComposioMcpCredential {
    name = "composioMcp";
    displayName = "Composio MCP";
    documentationUrl = "https://docs.composio.dev";
    properties = [
        {
            displayName: "Base URL",
            name: "baseUrl",
            type: "string",
            default: "https://levinnovation.mcp.agentyx.one/mcp",
            required: true,
        },
        {
            displayName: "Entity ID",
            name: "entityId",
            type: "string",
            default: "levinnovation-user-id",
            description: "x-entity-id header value",
        },
        {
            displayName: "Connected Account ID",
            name: "connectedAccountId",
            type: "string",
            default: "",
            description: "x-connected-account-id header value (optional)",
        },
        {
            displayName: "Auth Headers (JSON)",
            name: "authHeaders",
            type: "json",
            default: '{"x-composio-key": ""}',
            description: "Additional auth headers as JSON object",
        },
    ];
}
exports.ComposioMcpCredential = ComposioMcpCredential;
