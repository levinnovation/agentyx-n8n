import { DataSource, Repository } from "typeorm";
import { config } from "../config.js";
import {
  WorkflowEntity,
  CredentialsEntity,
  VariableEntity,
  TagEntity,
  WebhookEntity,
  SharedWorkflow,
} from "../entities/n8n.js";
import { N8nChangeLog } from "../entities/audit.js";

const AppDataSource = new DataSource({
  type: "postgres",
  host: config.dbHost,
  port: config.dbPort,
  username: config.dbUser,
  password: config.dbPassword,
  database: config.dbDatabase,
  schema: config.dbSchema,
  synchronize: false,
  logging: false,
  entities: [
    WorkflowEntity,
    CredentialsEntity,
    VariableEntity,
    TagEntity,
    WebhookEntity,
    SharedWorkflow,
    N8nChangeLog,
  ],
});

let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await AppDataSource.initialize();
    initialized = true;

    // Ensure audit schema and table exist
    await AppDataSource.query(`
      CREATE SCHEMA IF NOT EXISTS ${config.auditSchema};
    `);
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS ${config.auditSchema}.n8n_change_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(20) NOT NULL,
        object_type VARCHAR(30) NOT NULL,
        object_id VARCHAR(50),
        object_name VARCHAR(255) NOT NULL,
        tenant VARCHAR(50) NOT NULL,
        domain VARCHAR(50),
        capability VARCHAR(50),
        asset_name VARCHAR(100),
        commit_hash VARCHAR(40),
        commit_message TEXT,
        branch VARCHAR(100),
        repository_url TEXT,
        author_name VARCHAR(100),
        author_email VARCHAR(100),
        agent_skill VARCHAR(50),
        cli_version VARCHAR(20),
        cli_command VARCHAR(50),
        request_id VARCHAR(50),
        n8n_version VARCHAR(20) NOT NULL,
        n8n_instance_url TEXT NOT NULL,
        n8n_schema_version INT,
        previous_value JSONB,
        new_value JSONB,
        node_changes JSONB,
        connection_changes JSONB,
        diff_summary TEXT,
        deployed_at TIMESTAMPTZ DEFAULT now(),
        deployed_by VARCHAR(100),
        deployment_status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        rollback_hash VARCHAR(40)
      );
    `);
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_n8n_change_tenant ON ${config.auditSchema}.n8n_change_log(tenant);
    `);
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_n8n_change_commit ON ${config.auditSchema}.n8n_change_log(commit_hash);
    `);
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_n8n_change_object ON ${config.auditSchema}.n8n_change_log(object_type, object_name);
    `);
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_n8n_change_time ON ${config.auditSchema}.n8n_change_log(deployed_at DESC);
    `);
  })();

  return initPromise;
}

export { AppDataSource, ensureInitialized };

export class DbDeployer {
  constructor(private cfg: typeof config) {}

  async syncWorkflowTags(workflowName: string, tags: string[]): Promise<void> {
    await ensureInitialized();
    const tagRepo = AppDataSource.getRepository(TagEntity);
    const wfRepo = AppDataSource.getRepository(WorkflowEntity);

    const wf = await wfRepo.findOne({ where: { name: workflowName } });
    if (!wf) return;

    // Upsert tags
    for (const tagName of tags) {
      let tag = await tagRepo.findOne({ where: { name: tagName } });
      if (!tag) {
        tag = tagRepo.create({ name: tagName });
        await tagRepo.save(tag);
      }
    }

    // TODO: Link tags to workflow via workflow_tags join table if n8n schema uses one
    // n8n uses a tags relation on workflow_entity or a join table depending on version.
    // For now, this is a placeholder for the DB fallback.
  }

  async ensureWebhookEntries(nodes: Array<Record<string, unknown>>): Promise<void> {
    await ensureInitialized();
    const webhookRepo = AppDataSource.getRepository(WebhookEntity);

    for (const node of nodes) {
      if (node.type === "n8n-nodes-base.webhook") {
        const params = (node.parameters as Record<string, unknown>) || {};
        const path = params.path as string;
        const method = params.httpMethod as string;
        const workflowId = node.id as string;
        const nodeId = node.id as string;

        if (!path || !method) continue;

        let wh = await webhookRepo.findOne({
          where: { webhookPath: path, method, workflowId },
        });
        if (!wh) {
          wh = webhookRepo.create({
            webhookPath: path,
            method,
            workflowId,
            nodeId,
            isTest: false,
          });
          await webhookRepo.save(wh);
        }
      }
    }
  }

  async upsertCredential(
    name: string,
    type: string,
    encryptedData: Record<string, unknown>,
  ): Promise<void> {
    await ensureInitialized();
    const credRepo = AppDataSource.getRepository(CredentialsEntity);
    let cred = await credRepo.findOne({ where: { name } });
    if (!cred) {
      cred = credRepo.create({ name, type, data: encryptedData });
    } else {
      cred.data = encryptedData;
    }
    await credRepo.save(cred);
  }
}
