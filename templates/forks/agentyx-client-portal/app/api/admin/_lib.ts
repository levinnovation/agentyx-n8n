import { NextRequest, NextResponse } from "next/server";

function getBetterAuthBaseUrl(): string {
  return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "";
}

export async function proxyToBetterAuth(
  req: NextRequest,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<NextResponse> {
  const baseUrl = getBetterAuthBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "BETTER_AUTH_URL is not configured" }, { status: 500 });
  }

  const target = `${baseUrl}${path}`;
  const response = await fetch(target, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  return new NextResponse(text, { status: response.status, headers });
}
