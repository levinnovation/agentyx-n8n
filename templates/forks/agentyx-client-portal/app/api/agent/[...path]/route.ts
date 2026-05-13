import { NextRequest, NextResponse } from "next/server";

/**
 * Agent proxy — enforces document_visibility before forwarding to the agent service.
 * For each attachment in the request body:
 *   - context_only: strips signed_url, passes only excerpt
 *   - shareable: passes through full data including signed_url
 */

function filterAttachments(body: any): any {
  if (!body || !body.attachments || !Array.isArray(body.attachments)) return body;
  return {
    ...body,
    attachments: body.attachments.map((a: any) => {
      if (a.document_visibility === "shareable") return a;
      // context_only: strip signed_url, keep only excerpt
      return {
        ...a,
        signed_url: undefined,
        url: undefined,
      };
    }),
    user_documents: (body.user_documents || []).map((d: any) => ({
      ...d,
      signed_url: d.visibility === "shareable" ? d.signed_url : undefined,
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const agentUrl = process.env.AGENT_INTERNAL_URL || "http://agent.railway.internal:8000";
  const url = `${agentUrl}/${path}`;

  const res = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": process.env.INTERNAL_API_KEY || "",
    },
  });

  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: Object.fromEntries(res.headers) });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const agentUrl = process.env.AGENT_INTERNAL_URL || "http://agent.railway.internal:8000";
  const url = `${agentUrl}/${path}`;

  // Parse + filter document visibility before forwarding
  let bodyText = await req.text();
  try {
    const parsed = JSON.parse(bodyText);
    const filtered = filterAttachments(parsed);
    bodyText = JSON.stringify(filtered);
  } catch {
    // Not JSON; pass through as-is
  }

  const res = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": process.env.INTERNAL_API_KEY || "",
    },
    body: bodyText,
  });

  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: Object.fromEntries(res.headers) });
}
