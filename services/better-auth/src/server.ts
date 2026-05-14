import { betterAuth } from "better-auth";
import { organization, jwt, oidcProvider } from "better-auth/plugins";
import Fastify, { FastifyRequest } from "fastify";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { config } from "./config";
import { sendMail } from "./email";
import { resolveTenantFromHost } from "./tenant";

const pool = new Pool({
  connectionString: config.databaseUrl,
});
pool.on("connect", (client) => {
  client.query("SET search_path = better_auth, public").catch((err) => {
    console.error("[better-auth] Failed to set search_path:", err);
  });
});

const auth = betterAuth({
  baseURL: config.betterAuthUrl,
  secret: config.betterAuthSecret,
  database: pool,
  trustedOrigins: config.trustedOrigins,
  emailAndPassword: ({
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password using this link: ${url}`,
        html: `<p>Reset your password using this link:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  } as any),
  emailVerification: ({
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendMail({
        to: user.email,
        subject: "Verify your email",
        text: `Verify your email using this link: ${url}`,
        html: `<p>Verify your email using this link:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  } as any),
  socialProviders: {
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      hd: config.googleHd || undefined,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
      },
    },
  },
  advanced: {
    crossSubDomainCookies: config.cookieDomain
      ? {
          enabled: true,
          domain: config.cookieDomain,
        }
      : undefined,
    useSecureCookies: true,
  },
  plugins: [
    organization({
      sendInvitationEmail: async (data: { email: string; invitationLink: string }) => {
        await sendMail({
          to: data.email,
          subject: "You're invited to Agentyx",
          text: `Accept your invitation: ${data.invitationLink}`,
          html: `<p>You were invited to Agentyx.</p><p><a href="${data.invitationLink}">${data.invitationLink}</a></p>`,
        });
      },
    } as any),
    jwt(),
    oidcProvider({
      consentPage: `${config.betterAuthUrl}/consent`,
      allowDynamicClientRegistration: true,
      scopes: ["openid", "profile", "email"],
    } as any),
  ],
  databaseHooks: ({
    user: {
      create: {
        after: async (user: { id: string; email: string }) => {
          await logScimEvent("CREATE", "User", user.id, { state: "pending", email: user.email });
        },
      },
    },
  } as any),
});

const app = Fastify({ logger: true });

const membershipCache = new Map<string, { expiresAt: number; allowed: boolean; role: string | null }>();
const MEMBERSHIP_TTL_MS = 60_000;
let orgTablesCache: { expiresAt: number; enabled: boolean } | null = null;

function roleRank(role: string): number {
  switch (role) {
    case "owner":
      return 4;
    case "admin":
      return 3;
    case "member":
      return 2;
    case "viewer":
      return 1;
    default:
      return 0;
  }
}

async function resolveOrganizationId(slug: string): Promise<string | null> {
  if (!slug) return null;
  try {
    const result = await pool.query<{ id: string }>(
      `
        SELECT id
        FROM better_auth.organization
        WHERE slug = $1 OR tenant_id = $1
        LIMIT 1
      `,
      [slug],
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return null;
    }
    throw error;
  }
}

async function getMemberRole(userId: string, organizationId: string): Promise<string | null> {
  const key = `${userId}:${organizationId}`;
  const cached = membershipCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.allowed ? cached.role : null;
  }

  const result = await pool.query<{ role: string }>(
    `
      SELECT role
      FROM better_auth.member
      WHERE user_id = $1 AND organization_id = $2
      LIMIT 1
    `,
    [userId, organizationId],
  );
  const role = result.rows[0]?.role || null;
  membershipCache.set(key, {
    expiresAt: Date.now() + MEMBERSHIP_TTL_MS,
    allowed: Boolean(role),
    role,
  });
  return role;
}

async function logScimEvent(
  operation: string,
  resourceType: string,
  externalId: string,
  responseBody: Record<string, unknown>,
): Promise<void> {
  try {
    await pool.query(
      `
        INSERT INTO better_auth.scim_sync_log (operation, resource_type, external_id, status, response_body)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [operation, resourceType, externalId, "success", JSON.stringify(responseBody)],
    );
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code !== "42P01") {
      throw error;
    }
  }
}

async function requireAdminForTenant(req: FastifyRequest): Promise<{
  userId: string;
  organizationId: string;
}> {
  const orgTablesEnabled = await hasOrganizationTables();
  if (!orgTablesEnabled) {
    throw new Error("ORG_TABLES_UNAVAILABLE");
  }

  const session = await auth.api.getSession({
    headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
  });

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const tenant = resolveTenantFromHost(req.headers.host);
  const organizationId = await resolveOrganizationId(tenant.slug);
  if (!organizationId) {
    throw new Error("TENANT_ORG_NOT_FOUND");
  }

  const role = await getMemberRole(session.user.id, organizationId);
  if (!role || roleRank(role) < roleRank("admin")) {
    throw new Error("FORBIDDEN");
  }

  return { userId: session.user.id, organizationId };
}

async function hasOrganizationTables(): Promise<boolean> {
  if (orgTablesCache && orgTablesCache.expiresAt > Date.now()) {
    return orgTablesCache.enabled;
  }

  try {
    const result = await pool.query<{ organization_table: string | null; member_table: string | null }>(
      `
        SELECT
          to_regclass('better_auth.organization') AS organization_table,
          to_regclass('better_auth.member') AS member_table
      `,
    );
    const row = result.rows[0];
    const enabled = Boolean(row?.organization_table && row?.member_table);
    orgTablesCache = { expiresAt: Date.now() + MEMBERSHIP_TTL_MS, enabled };
    return enabled;
  } catch (error) {
    reqSafeLog(app, "error checking organization tables", error);
    orgTablesCache = { expiresAt: Date.now() + MEMBERSHIP_TTL_MS, enabled: false };
    return false;
  }
}

function reqSafeLog(server: typeof app, message: string, error: unknown): void {
  server.log.warn({ err: error }, message);
}

function resolveAllowedOrigin(originHeader: string | undefined): string {
  const origin = (originHeader || "").trim();
  return config.trustedOrigins.includes(origin) ? origin : "";
}

// CORS: reflect trusted origins instead of wildcard
app.addHook("onSend", async (req, reply) => {
  const allowed = resolveAllowedOrigin(req.headers.origin);
  if (allowed) {
    reply.header("Access-Control-Allow-Origin", allowed);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Vary", "Origin");
  }
});

// Health check
app.get("/health", async () => ({ status: "ok", service: "better-auth" }));

// Forward-auth endpoint for Caddy
app.get("/api/auth/forward-auth", async (req, reply) => {
  const session = await auth.api.getSession({
    headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
  });
  if (!session) {
    const acceptHeader = (req.headers.accept || "").toLowerCase();
    if (acceptHeader.includes("text/html")) {
      const host = req.headers.host || "";
      const returnTo = `https://${host}/`;
      const tenant = resolveTenantFromHost(host);
      const portalBaseUrl =
        config.portalBaseUrl ||
        (tenant.slug ? `https://${tenant.slug}.portal.agentyx.one` : config.betterAuthUrl);
      const loginUrl = new URL("/login", portalBaseUrl);
      loginUrl.searchParams.set("callbackUrl", returnTo);
      reply.header("Location", loginUrl.toString());
      reply.status(302);
      return { redirect: loginUrl.toString() };
    }
    reply.status(401);
    return { error: "Unauthorized" };
  }

  const orgTablesEnabled = await hasOrganizationTables();
  if (!orgTablesEnabled) {
    reply.header("X-Auth-User", session.user.id);
    reply.header("X-Auth-Email", session.user.email);
    reply.header("X-Auth-User-Name", session.user.name || "");
    reply.header("X-Auth-User-Role", (session.user as any).role || "client");
    return { ok: true, mode: "legacy" };
  }

  const tenant = resolveTenantFromHost(req.headers.host);
  const organizationId = await resolveOrganizationId(tenant.slug);
  if (!organizationId) {
    reply.status(403);
    return { error: "Tenant organization not found" };
  }

  const role = await getMemberRole(session.user.id, organizationId);
  if (!role) {
    const host = tenant.host || req.headers.host || "";
    const pendingUrl = `https://${host}/onboarding/pending`;
    reply.header("Location", pendingUrl);
    reply.status(403);
    return { error: "Pending admin approval", redirect: pendingUrl };
  }

  reply.header("X-Auth-User", session.user.id);
  reply.header("X-Auth-Email", session.user.email);
  reply.header("X-Auth-User-Name", session.user.name || "");
  reply.header("X-Auth-User-Role", role);
  return { ok: true };
});

app.get("/api/admin/pending-users", async (req, reply) => {
  try {
    const { organizationId } = await requireAdminForTenant(req);
    const result = await pool.query<{
      id: string;
      email: string;
      name: string | null;
      created_at: string;
    }>(
      `
        SELECT u.id, u.email, u.name, u."createdAt" AS created_at
        FROM public."user" u
        WHERE NOT EXISTS (
          SELECT 1 FROM better_auth.member m
          WHERE m.user_id = u.id
            AND m.organization_id = $1
        )
        ORDER BY u."createdAt" DESC
      `,
      [organizationId],
    );
    return { users: result.rows };
  } catch (error) {
    const message = (error as Error).message;
    if (message === "UNAUTHORIZED") return reply.status(401).send({ error: "Unauthorized" });
    if (message === "FORBIDDEN") return reply.status(403).send({ error: "Forbidden" });
    if (message === "TENANT_ORG_NOT_FOUND") return reply.status(404).send({ error: "Tenant organization not found" });
    if (message === "ORG_TABLES_UNAVAILABLE") return reply.status(503).send({ error: "Organization tables are not available" });
    req.log.error(error);
    return reply.status(500).send({ error: "Failed to list pending users" });
  }
});

app.post("/api/admin/approve-user", async (req, reply) => {
  try {
    const { organizationId } = await requireAdminForTenant(req);
    const body = (req.body || {}) as { userId?: string; role?: string };
    const userId = (body.userId || "").trim();
    const role = (body.role || "member").trim();
    if (!userId) {
      return reply.status(400).send({ error: "userId is required" });
    }

    await pool.query(
      `
        INSERT INTO better_auth.member (id, organization_id, user_id, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (organization_id, user_id)
        DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
      `,
      [`m_${randomUUID().replace(/-/g, "")}`, organizationId, userId, role],
    );

    const userLookup = await pool.query<{ email: string }>(
      `SELECT email FROM public."user" WHERE id = $1 LIMIT 1`,
      [userId],
    );
    const email = userLookup.rows[0]?.email;
    if (email) {
      await sendMail({
        to: email,
        subject: "Your Agentyx access is approved",
        text: "Your account has been approved. You can now sign in.",
        html: "<p>Your account has been approved. You can now sign in.</p>",
      });
    }

    await logScimEvent("UPDATE", "User", userId, { action: "approved", role, organizationId });

    return { ok: true };
  } catch (error) {
    const message = (error as Error).message;
    if (message === "UNAUTHORIZED") return reply.status(401).send({ error: "Unauthorized" });
    if (message === "FORBIDDEN") return reply.status(403).send({ error: "Forbidden" });
    if (message === "TENANT_ORG_NOT_FOUND") return reply.status(404).send({ error: "Tenant organization not found" });
    if (message === "ORG_TABLES_UNAVAILABLE") return reply.status(503).send({ error: "Organization tables are not available" });
    req.log.error(error);
    return reply.status(500).send({ error: "Failed to approve user" });
  }
});

app.post("/api/admin/reject-user", async (req, reply) => {
  try {
    await requireAdminForTenant(req);
    const body = (req.body || {}) as { userId?: string; reason?: string };
    const userId = (body.userId || "").trim();
    const reason = (body.reason || "Rejected by administrator").trim();
    if (!userId) {
      return reply.status(400).send({ error: "userId is required" });
    }

    await pool.query(
      `
        UPDATE public."user"
        SET "role" = $2,
            "updatedAt" = NOW()
        WHERE id = $1
      `,
      [userId, "rejected"],
    );

    await logScimEvent("UPDATE", "User", userId, { action: "rejected", reason });

    return { ok: true };
  } catch (error) {
    const message = (error as Error).message;
    if (message === "UNAUTHORIZED") return reply.status(401).send({ error: "Unauthorized" });
    if (message === "FORBIDDEN") return reply.status(403).send({ error: "Forbidden" });
    if (message === "TENANT_ORG_NOT_FOUND") return reply.status(404).send({ error: "Tenant organization not found" });
    if (message === "ORG_TABLES_UNAVAILABLE") return reply.status(503).send({ error: "Organization tables are not available" });
    req.log.error(error);
    return reply.status(500).send({ error: "Failed to reject user" });
  }
});

// JWKS endpoint for Agent JWT verification
app.get("/jwks.json", async (_req, reply) => {
  try {
    const result = await pool.query<{ publicKey: string }>(
      `SELECT "publicKey" FROM better_auth.jwks WHERE "expiresAt" IS NULL OR "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row) {
      return reply.status(404).send({ error: "No active JWKS key found" });
    }
    const jwk = JSON.parse(row.publicKey);
    reply.send({ keys: [jwk] });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return reply.status(404).send({ error: "JWKS table not found" });
    }
    app.log.error(error);
    reply.status(500).send({ error: "Failed to retrieve JWKS" });
  }
});

// Internal user lookup API (used by LibreChat and other apps)
app.get("/api/users/:sub", async (req, reply) => {
  const internalKey = req.headers["x-internal-api-key"];
  if (internalKey !== config.internalApiKey) {
    return reply.status(403).send({ error: "Forbidden" });
  }
  const { sub } = req.params as { sub: string };
  const result = await pool.query<{ id: string; email: string; name: string | null; image: string | null }>(
    `SELECT id, email, name, image FROM public."user" WHERE id = $1 LIMIT 1`,
    [sub],
  );
  const user = result.rows[0];
  if (!user) return reply.status(404).send({ error: "Not found" });
  reply.send({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    organizationIds: [],
    roles: [],
    customClaims: {},
  });
});

// Pass everything else to Better Auth handler
app.all("/*", async (req, reply) => {
  if (req.method === "OPTIONS") {
    const allowed = resolveAllowedOrigin(req.headers.origin);
    if (allowed) {
      reply.header("Access-Control-Allow-Origin", allowed);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      reply.header("Access-Control-Max-Age", "600");
      reply.header("Vary", "Origin");
    }
    reply.status(204).send();
    return;
  }

  // Build web-standard Request from Fastify request
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const url = new URL(req.url, `${proto}://${req.headers.host || "localhost"}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }
  
  // Handle body for POST/PUT/PATCH
  let body: string | undefined = undefined;
  if (req.body && ["POST", "PUT", "PATCH"].includes(req.method)) {
    body = JSON.stringify(req.body);
    headers.set("content-type", "application/json");
  }
  
  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });
  
  const response = await auth.handler(request);
  reply.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    reply.header(key, value);
  }
  const responseBody = await response.text();
  reply.send(responseBody);
});

app.listen({ port: config.port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`[better-auth] listening on port ${config.port}`);
});
