import YAML from "yaml";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export class WorkflowCompiler {
  private rootDir = process.cwd(); // TODO: derive from config or env

  compile(tenant: string, assetName: string): Record<string, unknown> {
    const yamlPath = join(
      this.rootDir,
      "tenants",
      tenant,
      "assets",
      "workflows",
      "n8n",
      assetName,
      "workflow.yaml",
    );

    if (!existsSync(yamlPath)) {
      throw new Error(`workflow.yaml not found: ${yamlPath}`);
    }

    const yamlContent = readFileSync(yamlPath, "utf-8");
    const parsed = YAML.parse(yamlContent) as Record<string, unknown>;

    const spec = parsed.spec as Record<string, unknown>;
    const metadata = parsed.metadata as Record<string, unknown>;

    // Transform YAML spec into n8n JSON structure
    const n8nJson: Record<string, unknown> = {
      name: metadata.name,
      nodes: this.compileNodes(spec.nodes as Array<Record<string, unknown>>),
      connections: this.compileConnections(spec.connections as Array<Record<string, unknown>>),
      settings: spec.settings ?? {},
      tags: spec.tags ?? [],
      active: false, // Activation handled by deployer
      versionCounter: 1,
    };

    return n8nJson;
  }

  private compileNodes(nodes: Array<Record<string, unknown>>): unknown[] {
    return (nodes ?? []).map((node, index) => ({
      parameters: node.config ?? {},
      id: node.name ?? `node-${index}`,
      name: node.name,
      type: this.mapNodeType(node.type as string),
      typeVersion: node.typeVersion ?? 1,
      position: node.position ?? [240 + index * 200, 300],
      ...(node.webhookId ? { webhookId: node.webhookId } : {}),
    }));
  }

  private compileConnections(connections: Array<Record<string, unknown>>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const conn of connections ?? []) {
      const from = conn.from as string;
      const to = conn.to as string;
      if (!result[from]) {
        result[from] = { main: [[]] };
      }
      (result[from] as Record<string, unknown[]>).main[0].push({
        node: to,
        type: "main",
        index: 0,
      });
    }
    return result;
  }

  private mapNodeType(yamlType: string): string {
    // Map YAML type names to n8n node type IDs
    const mapping: Record<string, string> = {
      webhook: "n8n-nodes-base.webhook",
      code: "n8n-nodes-base.code",
      set: "n8n-nodes-base.set",
      httpRequest: "n8n-nodes-base.httpRequest",
      executeWorkflowTrigger: "n8n-nodes-base.executeWorkflowTrigger",
      executeWorkflow: "n8n-nodes-base.executeWorkflow",
      respondToWebhook: "n8n-nodes-base.respondToWebhook",
      switch: "n8n-nodes-base.switch",
    };
    return mapping[yamlType] ?? yamlType;
  }
}
