import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { healthzRouter } from "./routes/healthz.js";
import { deployRouter } from "./routes/deploy.js";
import { diffRouter } from "./routes/diff.js";
import { migrateRouter } from "./routes/migrate.js";
import { auditRouter } from "./routes/audit.js";
import { credentialsRouter } from "./routes/credentials.js";
import { config } from "./config.js";

const PORT = config.port;
const COMPILER_TOKEN = config.compilerToken;

function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"] || req.headers["x-agentyx-request-id"];
  const cid =
    typeof incoming === "string" && incoming.length > 0 && incoming.length < 200
      ? incoming
      : randomUUID();
  (req as Request & { correlationId: string }).correlationId = cid;
  next();
}

function bearerAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/healthz") return next();
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${COMPILER_TOKEN}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function getCorrelationId(req: Request): string {
  return ((req as Request & { correlationId?: string }).correlationId ?? randomUUID()).toString();
}

const app = express();
app.disable("x-powered-by");
app.use(correlationIdMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "5mb" }));

// Attach correlation id to response headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("x-request-id", getCorrelationId(req));
  next();
});

app.use(bearerAuthMiddleware);

app.use("/healthz", healthzRouter);
app.use("/deploy", deployRouter);
app.use("/diff", diffRouter);
app.use("/migrate", migrateRouter);
app.use("/audit", auditRouter);
app.use("/credentials", credentialsRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "unhandled_error",
      error: err.message,
      stack: err.stack,
    }),
  );
  if (!res.headersSent) {
    res.status(500).json({ error: "internal_server_error", message: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      level: "info",
      msg: "compiler_listen",
      port: PORT,
      n8nApiUrl: config.n8nApiUrl,
      auditSchema: config.auditSchema,
    }),
  );
});
