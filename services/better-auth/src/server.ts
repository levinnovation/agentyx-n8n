import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { config } from "./config";
import * as http from "http";

const pool = new Pool({
  connectionString: config.databaseUrl,
});

const auth = betterAuth({
  database: pool,
  secret: config.betterAuthSecret,
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
});

function toWebRequest(req: http.IncomingMessage): Request {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
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
  return new Request(url.toString(), {
    method: req.method,
    headers,
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    });
    res.end();
    return;
  }

  // Default CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Forward-auth endpoint for Caddy
  if (url.pathname === "/api/auth/forward-auth") {
    const session = await auth.api.getSession({
      headers: new Headers(Object.entries(req.headers).map(([k, v]) => [k, String(v)])),
    });
    if (session) {
      res.writeHead(200, {
        "X-Auth-User": session.user.id,
        "X-Auth-Email": session.user.email,
      });
      res.end();
    } else {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
    }
    return;
  }

  // Pass everything else to Better Auth
  const request = toWebRequest(req);
  const response = await auth.handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  const body = await response.text();
  res.end(body);
});

server.listen(config.port, () => {
  console.log(`[better-auth] listening on port ${config.port}`);
});
