import { NextRequest } from "next/server";

export function resolveTenantSlug(url: string | URL, request?: NextRequest): string {
  // 1. Try x-forwarded-host header first (honors auth-proxy / Railway routing)
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const parts = forwardedHost.split(".");
      if (parts.length >= 2) {
        return parts[0];
      }
    }
  }

  // 2. Fall back to URL hostname
  const parsed = typeof url === "string" ? new URL(url) : url;
  const host = parsed.hostname;
  const parts = host.split(".");
  if (parts.length >= 2 && parts[0] !== "localhost" && parts[0] !== "agentyx-portal") {
    return parts[0];
  }

  // 3. Last resort: environment variable or default
  return process.env.AGENTYX_CLIENT_SLUG || "levinnovation";
}
