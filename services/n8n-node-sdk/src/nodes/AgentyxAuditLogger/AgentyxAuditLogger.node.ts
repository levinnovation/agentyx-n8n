import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
} from "n8n-workflow";

export class AgentyxAuditLogger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Agentyx Audit Logger",
    name: "agentyxAuditLogger",
    icon: "file:AgentyxAuditLogger.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{ $parameter["action"] }}',
    description:
      "Record execution metadata to agentyx_audit schema with full provenance",
    defaults: {
      name: "Agentyx Audit Logger",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      { name: "agentyxApi", required: false },
    ],
    properties: [
      {
        displayName: "Action",
        name: "action",
        type: "options",
        options: [
          { name: "Deploy", value: "deploy" },
          { name: "Update", value: "update" },
          { name: "Execute", value: "execute" },
          { name: "Migrate", value: "migrate" },
          { name: "Rollback", value: "rollback" },
        ],
        default: "execute",
      },
      {
        displayName: "Tenant",
        name: "tenant",
        type: "string",
        default: "={{ $json.tenant || 'levinnovation' }}",
      },
      {
        displayName: "Domain",
        name: "domain",
        type: "string",
        default: "={{ $json.domain || '' }}",
      },
      {
        displayName: "Capability",
        name: "capability",
        type: "string",
        default: "={{ $json.capability || '' }}",
      },
      {
        displayName: "Sub-Workflows Called (JSON)",
        name: "subWorkflows",
        type: "json",
        default: "=[]",
        description: "Array of sub-workflow names invoked in this execution",
      },
      {
        displayName: "Git Commit Hash",
        name: "gitHash",
        type: "string",
        default: "={{ $json.git_hash || '' }}",
      },
      {
        displayName: "Store in Database",
        name: "storeMode",
        type: "options",
        options: [
          { name: "Return Payload Only", value: "payload" },
          { name: "Write to Audit DB", value: "db" },
        ],
        default: "payload",
      },
    ],
  };

  async execute(
    this: IExecuteFunctions,
  ): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const action = this.getNodeParameter("action", i) as string;
      const tenant = this.getNodeParameter("tenant", i) as string;
      const domain = this.getNodeParameter("domain", i) as string;
      const capability = this.getNodeParameter("capability", i) as string;
      const subWorkflowsRaw = this.getNodeParameter("subWorkflows", i) as string;
      const gitHash = this.getNodeParameter("gitHash", i) as string;
      const storeMode = this.getNodeParameter("storeMode", i) as string;

      let subWorkflows: string[] = [];
      try {
        subWorkflows = JSON.parse(subWorkflowsRaw || "[]");
      } catch {
        subWorkflows = [];
      }

      const record = {
        action,
        tenant,
        domain,
        capability,
        sub_workflows: subWorkflows,
        git_hash: gitHash,
        timestamp: new Date().toISOString(),
        workflow_name: this.getWorkflow().name,
        workflow_id: this.getWorkflow().id,
        execution_id: this.getExecutionId ? this.getExecutionId() : "",
      };

      if (storeMode === "db") {
        try {
          const agentyxCreds = await this.getCredentials("agentyxApi");
          const apiUrl = String(agentyxCreds.baseUrl || "").replace(/\/+$/, "");
          const apiKey = String(agentyxCreds.apiKey || "");
          if (apiUrl && apiKey) {
            await this.helpers.request({
              method: "POST",
              url: `${apiUrl}/audit/log`,
              headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
              body: record,
              json: true,
              timeout: 10000,
            });
          }
        } catch {
          // audit write failure should not break the workflow
        }
      }

      returnData.push({
        json: {
          audit: record,
          stored: storeMode === "db",
        },
        pairedItem: { item: i },
      });
    }

    return [returnData];
  }
}