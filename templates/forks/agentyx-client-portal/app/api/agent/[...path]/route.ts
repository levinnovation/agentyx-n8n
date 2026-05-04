import { NextRequest, NextResponse } from "next/server";

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

  const res = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Api-Key": process.env.INTERNAL_API_KEY || "",
    },
    body: await req.text(),
  });

  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: Object.fromEntries(res.headers) });
}
