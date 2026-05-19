export interface DeployMeta {
  tenant: string;
  commitHash?: string;
  commitMessage?: string;
  branch?: string;
  repositoryUrl?: string;
  authorName?: string;
  authorEmail?: string;
  agentSkill?: string;
  cliVersion?: string;
  cliCommand?: string;
  requestId?: string;
}

export interface CompiledAsset {
  name: string;
  tenant: string;
  domain?: string;
  capability?: string;
  type: "workflow" | "credential" | "variable";
  yamlPath?: string;
  json?: unknown;
  tags?: string[];
  nodes?: unknown[];
  connections?: unknown;
  settings?: unknown;
  active?: boolean;
}

export interface AuditEntry {
  action: "CREATE" | "UPDATE" | "DELETE" | "ACTIVATE" | "DEACTIVATE" | "MIGRATE";
  objectType: string;
  objectId?: string;
  objectName: string;
  tenant: string;
  domain?: string;
  capability?: string;
  assetName?: string;
  commitHash?: string;
  commitMessage?: string;
  branch?: string;
  repositoryUrl?: string;
  authorName?: string;
  authorEmail?: string;
  agentSkill?: string;
  cliVersion?: string;
  cliCommand?: string;
  requestId?: string;
  n8nVersion: string;
  n8nInstanceUrl: string;
  previousValue?: unknown;
  newValue?: unknown;
  nodeChanges?: unknown;
  connectionChanges?: unknown;
  diffSummary?: string;
  deployedAt?: Date;
  deployedBy?: string;
  deploymentStatus: "success" | "failed" | "rolled_back";
  errorMessage?: string;
  rollbackHash?: string;
}

export interface DeploymentReceipt {
  receiptId: string;
  tenant: string;
  environment: string;
  deployedAt: string;
  status: "success" | "partial" | "failed";
  commitHash?: string;
  author?: string;
  agentSkill?: string;
  cliVersion?: string;
  n8nVersion: string;
  changes: Array<{
    action: string;
    objectType: string;
    objectName: string;
    objectId?: string;
    auditId?: string;
  }>;
  errors: Array<{
    objectName: string;
    message: string;
    code?: string;
  }>;
}
