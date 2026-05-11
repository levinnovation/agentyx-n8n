export interface WorkflowToolRegistryItem {
  tool: string;
  title: string;
  description: string;
  webhook_url: string;
  input_schema: Record<string, unknown>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRegistryFromEnv(raw: string): WorkflowToolRegistryItem[] {
  if (!raw.trim()) throw new Error('N8N_TOOLS_REGISTRY_JSON is empty');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `N8N_TOOLS_REGISTRY_JSON parse failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!Array.isArray(parsed)) throw new Error('N8N_TOOLS_REGISTRY_JSON must be a JSON array');

  const tools: WorkflowToolRegistryItem[] = [];
  for (const item of parsed) {
    if (!isObject(item)) throw new Error('Registry item must be object');
    const tool = typeof item.tool === 'string' ? item.tool.trim() : '';
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    const webhookUrl = typeof item.webhook_url === 'string' ? item.webhook_url.trim() : '';
    const inputSchema = isObject(item.input_schema) ? item.input_schema : null;
    if (!tool || !title || !description || !webhookUrl || !inputSchema) {
      throw new Error(`Invalid registry item: ${JSON.stringify(item)}`);
    }
    tools.push({
      tool,
      title,
      description,
      webhook_url: webhookUrl,
      input_schema: inputSchema,
    });
  }

  return tools;
}
