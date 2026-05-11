export type TenantResolution = {
  host: string;
  slug: string;
};

function normalizeHost(rawHost?: string): string {
  return (rawHost || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function resolveTenantFromHost(rawHost?: string): TenantResolution {
  const host = normalizeHost(rawHost);
  if (!host) {
    return { host: "", slug: "" };
  }

  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) {
    return { host, slug: "" };
  }

  // Canonical tenant domains look like:
  // - levinnovation.portal.agentyx.one
  // - levinnovation.n8n.agentyx.one
  // - levinnovation.flowise.agentyx.one
  const slug = parts[0] || "";
  return { host, slug };
}
