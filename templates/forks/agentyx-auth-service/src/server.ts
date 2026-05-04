import Fastify from "fastify";
import { betterAuth } from "better-auth";
import { oAuthProvider } from "@better-auth/oauth-provider";
import { organization } from "@better-auth/organization";
import { config } from "./config";

const auth = betterAuth({
  database: config.DATABASE_URL,
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  trustedOrigins: config.TRUSTED_ORIGINS,
  plugins: [
    oAuthProvider({
      // OAuth 2.1 Provider endpoints
    }),
    organization(),
  ],
  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      hd: config.GOOGLE_HD,
    },
  },
});

const app = Fastify({ logger: true });

app.addHook("onSend", async (_req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Credentials", "true");
});

app.route({
  method: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  url: "/api/auth/*",
  handler: async (req, reply) => {
    const response = await auth.handler(req.raw);
    reply.status(response.status).send(await response.text());
  },
});

app.get("/api/auth/forward-auth", async (req, reply) => {
  const session = await auth.api.getSession({
    headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
  });
  if (session) {
    reply.header("X-Auth-User", session.user.id);
    reply.header("X-Auth-Email", session.user.email);
    reply.send({ ok: true });
  } else {
    reply.status(401).send({ error: "Unauthorized" });
  }
});

app.get("/jwks.json", async (_req, reply) => {
  const jwks = await auth.api.getJwks();
  reply.send(jwks);
});

app.get("/api/users/:sub", async (req, reply) => {
  const internalKey = req.headers["x-internal-api-key"];
  if (internalKey !== config.INTERNAL_API_KEY) {
    return reply.status(403).send({ error: "Forbidden" });
  }
  const { sub } = req.params as { sub: string };
  const user = await auth.api.getUser({ id: sub });
  if (!user) return reply.status(404).send({ error: "Not found" });
  reply.send({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    organizationIds: [], // populated by organization plugin
    roles: [],
    customClaims: {},
  });
});

// SCIM 2.0 endpoints (ADR-0016)
app.get("/api/scim/v2/Users", async (_req, reply) => {
  reply.status(501).send({ error: "Not implemented yet" });
});

app.listen({ port: parseInt(config.PORT, 10), host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
