import { betterAuth } from "better-auth";
import { oAuthProvider } from "@better-auth/oauth-provider";
import { organization } from "@better-auth/organization";
import Fastify from "fastify";
import { config } from "./config";

const auth = betterAuth({
  baseURL: config.betterAuthUrl,
  secret: config.betterAuthSecret,
  database: config.databaseUrl,
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
  plugins: [
    oAuthProvider(),
    organization(),
  ],
});

const app = Fastify({ logger: true });

// CORS: reflect trusted origins instead of wildcard (required for credentials)
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

// JWKS endpoint
app.get("/.well-known/openid-configuration", async () => {
  return {
    issuer: config.oidcIssuer,
    authorization_endpoint: `${config.betterAuthUrl}/api/auth/authorize`,
    token_endpoint: `${config.betterAuthUrl}/api/auth/token`,
    userinfo_endpoint: `${config.betterAuthUrl}/api/auth/userinfo`,
    jwks_uri: `${config.betterAuthUrl}/jwks.json`,
  };
});

app.get("/jwks.json", async () => {
  return auth.api.getJwks();
});

// Internal user lookup (for shadow-user sync)
app.get("/api/users/:sub", async (req, reply) => {
  const internalKey = req.headers["x-internal-api-key"] as string | undefined;
  if (!config.internalApiKey || internalKey !== config.internalApiKey) {
    reply.status(401);
    return { error: "Unauthorized" };
  }

  const { sub } = req.params as { sub: string };
  const user = await auth.api.getUser({
    query: { id: sub },
    headers: new Headers(),
  });

  if (!user) {
    reply.status(404);
    return { error: "User not found" };
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: user.emailVerified,
    role: (user as any).role,
    organizationIds: (user as any).organizationIds || [],
    roles: (user as any).roles || [],
    customClaims: (user as any).customClaims || {},
  };
});

// SCIM stub
app.get("/api/scim/v2/Users", async (req, reply) => {
  reply.status(501);
  return { error: "Not implemented yet" };
});

// Forward-auth endpoint for Caddy
app.get("/api/auth/forward-auth", async (req, reply) => {
  const session = await auth.api.getSession({
    headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
  });
  if (session) {
    reply.header("X-Auth-User", session.user.id);
    reply.header("X-Auth-Email", session.user.email);
    return { ok: true };
  } else {
    reply.status(401);
    return { error: "Unauthorized" };
  }
});

// Pass everything else to Better Auth handler
// Using req.raw fixes the body-parsing bug (Fastify already parsed the body)
app.all("/*", async (req, reply) => {
  const response = await auth.handler(req.raw);
  reply.status(response.status);
  for (const [key, value] of response.headers.entries()) {
    reply.header(key, value);
  }
  const body = await response.text();
  reply.send(body);
});

app.listen({ port: config.port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`[better-auth] listening on port ${config.port}`);
});
