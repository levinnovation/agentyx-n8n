import { AppDataSource, ensureInitialized } from "./dbDeployer.js";
import { N8nChangeLog } from "../entities/audit.js";
import { config } from "../config.js";
import type { AuditEntry } from "../types/index.js";

export class AuditLogger {
  constructor(private cfg: typeof config) {}

  async log(entry: AuditEntry): Promise<string> {
    await ensureInitialized();
    const repo = AppDataSource.getRepository(N8nChangeLog);

    const log = repo.create({
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId,
      objectName: entry.objectName,
      tenant: entry.tenant,
      domain: entry.domain,
      capability: entry.capability,
      assetName: entry.assetName,
      commitHash: entry.commitHash,
      commitMessage: entry.commitMessage,
      branch: entry.branch,
      repositoryUrl: entry.repositoryUrl,
      authorName: entry.authorName,
      authorEmail: entry.authorEmail,
      agentSkill: entry.agentSkill,
      cliVersion: entry.cliVersion,
      cliCommand: entry.cliCommand,
      requestId: entry.requestId,
      n8nVersion: entry.n8nVersion ?? this.cfg.n8nVersion,
      n8nInstanceUrl: this.cfg.n8nApiUrl,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
      nodeChanges: entry.nodeChanges,
      connectionChanges: entry.connectionChanges,
      diffSummary: entry.diffSummary,
      deployedBy: entry.deployedBy,
      deploymentStatus: entry.deploymentStatus,
      errorMessage: entry.errorMessage,
      rollbackHash: entry.rollbackHash,
    });

    const saved = await repo.save(log);
    return saved.id;
  }
}
