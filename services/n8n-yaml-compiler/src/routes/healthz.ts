import { Router } from "express";
import { config } from "../config.js";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "n8n-yaml-compiler",
    n8nVersion: config.n8nVersion,
    n8nApiUrl: config.n8nApiUrl,
    auditSchema: config.auditSchema,
  });
});

export { router as healthzRouter };
