export interface InvokeN8nToolInput {
  webhookUrl: string;
  bridgeSecret: string;
  payload: Record<string, unknown>;
  requestId: string;
}

export interface InvokeN8nToolResult {
  status: number;
  bodyText: string;
  parsedBody: unknown;
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function invokeN8nTool(input: InvokeN8nToolInput): Promise<InvokeN8nToolResult> {
  const response = await fetch(input.webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-n8n-bridge-secret': input.bridgeSecret,
      'x-request-id': input.requestId,
    },
    body: JSON.stringify(input.payload),
  });

  const bodyText = await response.text();
  let parsedBody: unknown = null;
  if (bodyText.trim()) {
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      parsedBody = { raw: bodyText };
    }
  }

  if (response.status >= 500) {
    throw new Error(
      `n8n webhook failed (${response.status}) at ${redactUrl(input.webhookUrl)}: ${bodyText.slice(0, 400)}`,
    );
  }

  return {
    status: response.status,
    bodyText,
    parsedBody,
  };
}
