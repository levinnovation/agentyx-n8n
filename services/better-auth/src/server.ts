import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import Fastify from "fastify";
import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const auth = betterAuth({
  baseURL: config.betterAuthUrl,
  secret: config.betterAuthSecret,
  database: pool,
  trustedOrigins: config.trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      hd: config.googleHd || undefined,
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: "agentyx.one",
    },
    useSecureCookies: true,
  },
  plugins: [
    organization(),
  ],
});

const app = Fastify({ logger: true });

// CORS: reflect trusted origins instead of wildcard
app.addHook("onSend", async (req, reply) => {
  const origin = req.headers.origin || "";
  const allowed = config.trustedOrigins.includes(origin) ? origin : "";
  if (allowed) {
    reply.header("Access-Control-Allow-Origin", allowed);
    reply.header("Access-Control-Allow-Credentials", "true");
  }
});

// Health check
app.get("/health", async () => ({ status: "ok", service: "better-auth" }));

// Forward-auth endpoint for Caddy
app.get("/api/auth/forward-auth", async (req, reply) => {
  const session = await auth.api.getSession({
    headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
  });
  if (session) {
    reply.header("X-Auth-User", session.user.id);
    reply.header("X-Auth-Email", session.user.email);
    reply.header("X-Auth-User-Name", session.user.name || "");
    reply.header("X-Auth-User-Role", (session.user as any).role || "client");
    return { ok: true };
  } else {
    reply.status(401);
    return { error: "Unauthorized" };
  }
});

// Pass everything else to Better Auth handler
app.all("/*", async (req, reply) => {
  // Build web-standard Request from Fastify request
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
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
