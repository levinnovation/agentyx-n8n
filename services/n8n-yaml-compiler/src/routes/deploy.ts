import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { ApiDeployer } from "../deployer/apiDeployer.js";
import { DbDeployer } from "../deployer/dbDeployer.js";
import { AuditLogger } from "../deployer/auditLogger.js";
import { WorkflowCompiler } from "../compiler/workflowCompiler.js";
import { CredentialCompiler } from "../compiler/credentialCompiler.js";
import type { DeployMeta, DeploymentReceipt, CompiledAsset } from "../types/index.js";

const router = Router();
const apiDeployer = new ApiDeployer(config.n8nApiUrl, config.n8nApiKey);
const dbDeployer = new DbDeployer(config);
const auditLogger = new AuditLogger(config);
const workflowCompiler = new WorkflowCompiler();
const credentialCompiler = new CredentialCompiler(config.n8nEncryptionKey);

interface DeployRequestBody {
  tenant: string;
  assets?: string[]; // if omitted, deploy all for tenant
  all?: boolean;
  commitHash?: string;
  commitMessage?: string;
  branch?: string;
  repositoryUrl?: string;
  authorName?: string;
  authorEmail?: string;
  agentSkill?: string;
  cliVersion?: string;
  cliCommand?: string;
}

function extractMeta(req: Request, body: DeployRequestBody): DeployMeta {
  return {
    tenant: body.tenant,
    commitHash: body.commitHash ?? (req.headers["x-agentyx-git-commit"] as string) ?? undefined,
    commitMessage: body.commitMessage,
    branch: body.branch ?? (req.headers["x-agentyx-git-branch"] as string) ?? undefined,
    repositoryUrl: body.repositoryUrl,
    authorName: body.authorName ?? (req.headers["x-agentyx-git-author"] as string) ?? undefined,
    authorEmail: body.authorEmail,
    agentSkill: body.agentSkill ?? (req.headers["x-agentyx-agent-skill"] as string) ?? undefined,
    cliVersion: body.cliVersion ?? (req.headers["x-agentyx-cli-version"] as string) ?? undefined,
    cliCommand: body.cliCommand,
    requestId: (req as Request & { correlationId?: string }).correlationId ?? randomUUID(),
  };
}

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as DeployRequestBody;
  if (!body.tenant) {
    res.status(400).json({ error: "tenant is required" });
    return;
  }

  const meta = extractMeta(req, body);
  const receipt: DeploymentReceipt = {
    receiptId: randomUUID(),
    tenant: body.tenant,
    environment: "dev", // TODO: derive from request or config
    deployedAt: new Date().toISOString(),
    status: "success",
    commitHash: meta.commitHash,
    author: meta.authorName,
    agentSkill: meta.agentSkill,
    cliVersion: meta.cliVersion,
    n8nVersion: config.n8nVersion,
    changes: [],
    errors: [],
  };

  try {
    // TODO: Load compiled assets from filesystem or request payload
    const compiledAssets: CompiledAsset[] = []; // placeholder

    for (const asset of compiledAssets) {
      try {
        if (asset.type === "workflow") {
          // 1. Try API first
          const existing = await apiDeployer.findWorkflowByName(asset.name);
          let action: "CREATE" | "UPDATE" = "CREATE";
          let previousValue: unknown = null;
          if (existing) {
            action = "UPDATE";
            previousValue = existing;
            await apiDeployer.updateWorkflow(existing.id, asset.json);
          } else {
            const created = await apiDeployer.createWorkflow(asset.json);
            if (asset.active && created.id) {
              await apiDeployer.activateWorkflow(created.id);
            }
          }

          // 2. DB fallback for tags, webhooks, permissions
          if (asset.tags && asset.tags.length > 0) {
            await dbDeployer.syncWorkflowTags(asset.name, asset.tags);
          }
          if (asset.nodes) {
            await dbDeployer.ensureWebhookEntries(asset.nodes as Array<Record<string, unknown>>);
          }

          // 3. Audit log
          const auditId = await auditLogger.log({
            action,
            objectType: "workflow",
            objectName: asset.name,
            tenant: asset.tenant,
            domain: asset.domain,
            capability: asset.capability,
            assetName: asset.name,
            previousValue,
            newValue: asset.json,
            deploymentStatus: "success",
            ...meta,
          });

          receipt.changes.push({
            action,
            objectType: "workflow",
            objectName: asset.name,
            auditId,
          });
        } else if (asset.type === "credential") {
          const encrypted = credentialCompiler.compile(asset.json as Record<string, unknown>);
          await dbDeployer.upsertCredential(asset.name, asset.type, encrypted);

          const auditId = await auditLogger.log({
            action: "UPDATE",
            objectType: "credential",
            objectName: asset.name,
            tenant: asset.tenant,
            deploymentStatus: "success",
            ...meta,
          });

          receipt.changes.push({
            action: "UPDATE",
            objectType: "credential",
            objectName: asset.name,
            auditId,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        receipt.errors.push({ objectName: asset.name, message, code: "DEPLOY_ERROR" });
        receipt.status = receipt.status === "success" ? "partial" : "failed";

        await auditLogger.log({
          action: "UPDATE",
          objectType: asset.type,
          objectName: asset.name,
          tenant: asset.tenant,
          deploymentStatus: "failed",
          errorMessage: message,
          ...meta,
        });
      }
    }

    res.status(200).json(receipt);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    receipt.status = "failed";
    res.status(500).json({ ...receipt, error: message });
  }
});

export { router as deployRouter };
