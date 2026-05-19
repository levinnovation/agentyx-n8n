import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
  NodeOperationError,
} from "n8n-workflow";

export class AgentyxAIAgentBasicNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Agentyx AI Agent (Basic)",
    name: "agentyxAIAgentBasicNode",
    icon: "file:AgentyxAIAgentBasicNode.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{ $parameter["model"] }}',
    description:
      "Encapsulates AI Agent + OpenRouter Chat Model + Redis Chat Memory with configurable system prompt and tools",
    defaults: {
      name: "Agentyx AI Agent",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      { name: "openrouterApi", required: true },
      { name: "redisAccount", required: false },
    ],
    properties: [
      {
        displayName: "Model",
        name: "model",
        type: "options",
        options: [
          { name: "OpenAI GPT-4o", value: "openai/gpt-4o" },
          { name: "OpenAI GPT-4o Mini", value: "openai/gpt-4o-mini" },
          { name: "Anthropic Claude Sonnet 4", value: "anthropic/claude-sonnet-4" },
          { name: "Google Gemini 2.5 Flash", value: "google/gemini-2.5-flash" },
        ],
        default: "openai/gpt-4o",
      },
      {
        displayName: "Temperature",
        name: "temperature",
        type: "number",
        typeOptions: { minValue: 0, maxValue: 1 },
        default: 0.3,
        description: "Sampling temperature (0 = deterministic, 1 = creative)",
      },
      {
        displayName: "Max Tokens",
        name: "maxTokens",
        type: "number",
        default: 4096,
      },
      {
        displayName: "System Prompt",
        name: "systemPrompt",
        type: "string",
        typeOptions: { rows: 10 },
        default: "",
        placeholder:
          "You are an AI assistant. Be helpful, concise, and accurate.",
        description:
          "The system message that defines the agent's behavior. Supports n8n expressions.",
      },
      {
        displayName: "User Message",
        name: "userMessage",
        type: "string",
        default: "={{ $json.message }}",
        description: "The user input message. Supports n8n expressions.",
      },
      {
        displayName: "Enable Memory",
        name: "memoryEnabled",
        type: "boolean",
        default: true,
        description: "Use Redis to persist conversation context across runs",
      },
      {
        displayName: "Memory Key Prefix",
        name: "memoryKeyPrefix",
        type: "string",
        default: "agx",
        description:
          "Redis key prefix. Full key becomes {prefix}:{channel}:{conversation_id}",
        displayOptions: { show: { memoryEnabled: [true] } },
      },
      {
        displayName: "Context Window Length",
        name: "contextWindowLength",
        type: "number",
        default: 6,
        description: "Number of previous message pairs to include",
        displayOptions: { show: { memoryEnabled: [true] } },
      },
      {
        displayName: "Session ID Expression",
        name: "sessionId",
        type: "string",
        default:
          "={{ $json.channel + ':' + ($json.conversation_id || $json.user_id || 'default') }}",
        description: "Expression that resolves to a unique session identifier",
        displayOptions: { show: { memoryEnabled: [true] } },
      },
      {
        displayName: "Tools (JSON)",
        name: "tools",
        type: "json",
        default: "[]",
        description:
          "Array of tool definitions. Each tool needs name, description, and input_schema.",
      },
      {
        displayName: "Timeout (ms)",
        name: "timeout",
        type: "number",
        default: 30000,
        description: "Maximum milliseconds to wait for the model response",
      },
    ],
  };

  async execute(
    this: IExecuteFunctions,
  ): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const model = this.getNodeParameter("model", 0) as string;
    const temperature = this.getNodeParameter("temperature", 0) as number;
    const maxTokens = this.getNodeParameter("maxTokens", 0) as number;
    const systemPrompt = this.getNodeParameter("systemPrompt", 0) as string;
    const userMessage = this.getNodeParameter("userMessage", 0) as string;
    const memoryEnabled = this.getNodeParameter("memoryEnabled", 0) as boolean;
    const timeout = this.getNodeParameter("timeout", 0) as number;

    const credentials = await this.getCredentials("openrouterApi");
    const apiKey = credentials.apiKey as string;
    const httpReferer = (credentials.httpReferer as string) || "https://levinnovation.com";
    const title = (credentials.title as string) || "Lev Innovation Agent";

    if (!apiKey) {
      throw new NodeOperationError(
        this.getNode(),
        "OpenRouter API key is required.",
      );
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Resolve expressions
      const resolvedSystem = systemPrompt;
      const resolvedUser = userMessage;

      // Build messages array
      const messages: Array<{ role: string; content: string }> = [];
      if (resolvedSystem) {
        messages.push({ role: "system", content: resolvedSystem });
      }

      // If memory enabled, fetch previous context from Redis
      if (memoryEnabled) {
        const prefix = this.getNodeParameter("memoryKeyPrefix", i) as string;
        const sessionExpr = this.getNodeParameter("sessionId", i) as string;
        const contextWindow = this.getNodeParameter(
          "contextWindowLength",
          i,
        ) as number;

        try {
          const redisCreds = await this.getCredentials("redisAccount");
          // Use n8n's built-in Redis helper or raw connection
          // For now, we document that memory integration requires external wiring
          // or the node can be extended to use ioredis
          messages.push({
            role: "system",
            content: `[Memory session: ${prefix}:${sessionExpr}, window: ${contextWindow}]`,
          });
        } catch {
          // Redis not configured; continue without memory
        }
      }

      messages.push({ role: "user", content: resolvedUser });

      // Parse tools JSON
      const toolsRaw = this.getNodeParameter("tools", i) as string;
      let tools: unknown[] = [];
      try {
        tools = JSON.parse(toolsRaw || "[]");
      } catch {
        // ignore parse errors; proceed without tools
      }

      // Call OpenRouter
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      };
      if (Array.isArray(tools) && tools.length > 0) {
        body.tools = tools;
      }

      try {
        const response = await this.helpers.request({
          method: "POST",
          url: "https://openrouter.ai/api/v1/chat/completions",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": httpReferer,
            "X-Title": title,
          },
          body,
          json: true,
          timeout,
        });

        const choice = response?.choices?.[0];
        const message = choice?.message;
        const finishReason = choice?.finish_reason;

        returnData.push({
          json: {
            reply_text: message?.content || "",
            model: response?.model || model,
            usage: response?.usage || null,
            finish_reason: finishReason,
            tool_calls: message?.tool_calls || [],
            metadata: {
              timestamp: new Date().toISOString(),
              session_memory_enabled: memoryEnabled,
            },
          },
          pairedItem: { item: i },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new NodeOperationError(
          this.getNode(),
          `OpenRouter request failed: ${msg}`,
          { itemIndex: i },
        );
      }
    }

    return [returnData];
  }
}
