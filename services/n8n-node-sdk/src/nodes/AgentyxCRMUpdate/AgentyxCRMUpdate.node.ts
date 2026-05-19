import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
  NodeOperationError,
  IHttpRequestMethods,
} from "n8n-workflow";

export class AgentyxCRMUpdate implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Agentyx CRM Update (Twenty)",
    name: "agentyxCRMUpdate",
    icon: "file:AgentyxCRMUpdate.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{ $parameter["operation"] }}',
    description:
      "Create or update People, Companies, and Opportunities in Twenty CRM",
    defaults: {
      name: "Agentyx CRM Update",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      { name: "twentyCrmApi", required: true },
    ],
    properties: [
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        options: [
          { name: "Create Person", value: "createPerson" },
          { name: "Update Person", value: "updatePerson" },
          { name: "Create Company", value: "createCompany" },
          { name: "Update Company", value: "updateCompany" },
          { name: "Create Opportunity", value: "createOpportunity" },
          { name: "Update Opportunity", value: "updateOpportunity" },
          { name: "Link Person to Company", value: "linkPersonToCompany" },
        ],
        default: "createPerson",
      },
      {
        displayName: "Record ID",
        name: "recordId",
        type: "string",
        default: "",
        description: "Required for update operations",
        displayOptions: {
          show: {
            operation: [
              "updatePerson",
              "updateCompany",
              "updateOpportunity",
              "linkPersonToCompany",
            ],
          },
        },
      },
      {
        displayName: "Payload (JSON)",
        name: "payload",
        type: "json",
        default: "{}",
        description:
          "Fields to create/update. Example: { firstName: 'John', emails: { primaryEmail: 'john@example.com' } }",
      },
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "={{ $credentials.twentyCrmApi.baseUrl || 'https://levinnovation.crm.agentyx.one/rest' }}",
      },
      {
        displayName: "Timeout (ms)",
        name: "timeout",
        type: "number",
        default: 15000,
      },
    ],
  };

  async execute(
    this: IExecuteFunctions,
  ): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials("twentyCrmApi");
    const apiKey = String(credentials.apiKey || "");
    const defaultBaseUrl = String(credentials.baseUrl || "https://levinnovation.crm.agentyx.one/rest");

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter("operation", i) as string;
      const payloadRaw = this.getNodeParameter("payload", i) as string;
      const baseUrlParam = this.getNodeParameter("baseUrl", i, defaultBaseUrl) as string;
      const baseUrl = String(baseUrlParam || defaultBaseUrl).replace(/\/+$/, "");
      const timeout = this.getNodeParameter("timeout", i) as number;

      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(payloadRaw || "{}");
      } catch {
        throw new NodeOperationError(
          this.getNode(),
          "Invalid JSON in payload field",
          { itemIndex: i },
        );
      }

      let url = "";
      let method: IHttpRequestMethods = "POST";

      switch (operation) {
        case "createPerson":
          url = `${baseUrl}/people`;
          method = "POST";
          break;
        case "updatePerson": {
          const personId = this.getNodeParameter("recordId", i) as string;
          if (!personId) {
            throw new NodeOperationError(
              this.getNode(),
              "Record ID is required for updatePerson",
              { itemIndex: i },
            );
          }
          url = `${baseUrl}/people/${personId}`;
          method = "PATCH";
          break;
        }
        case "createCompany":
          url = `${baseUrl}/companies`;
          method = "POST";
          break;
        case "updateCompany": {
          const companyId = this.getNodeParameter("recordId", i) as string;
          if (!companyId) {
            throw new NodeOperationError(
              this.getNode(),
              "Record ID is required for updateCompany",
              { itemIndex: i },
            );
          }
          url = `${baseUrl}/companies/${companyId}`;
          method = "PATCH";
          break;
        }
        case "createOpportunity":
          url = `${baseUrl}/opportunities`;
          method = "POST";
          break;
        case "updateOpportunity": {
          const oppId = this.getNodeParameter("recordId", i) as string;
          if (!oppId) {
            throw new NodeOperationError(
              this.getNode(),
              "Record ID is required for updateOpportunity",
              { itemIndex: i },
            );
          }
          url = `${baseUrl}/opportunities/${oppId}`;
          method = "PATCH";
          break;
        }
        case "linkPersonToCompany": {
          const personId = this.getNodeParameter("recordId", i) as string;
          if (!personId) {
            throw new NodeOperationError(
              this.getNode(),
              "Record ID (person ID) is required for linkPersonToCompany",
              { itemIndex: i },
            );
          }
          url = `${baseUrl}/people/${personId}`;
          method = "PATCH";
          // Ensure payload contains companyId
          if (!payload.companyId) {
            throw new NodeOperationError(
              this.getNode(),
              "payload.companyId is required for linkPersonToCompany",
              { itemIndex: i },
            );
          }
          break;
        }
        default:
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation: ${operation}`,
            { itemIndex: i },
          );
      }

      try {
        const response = await this.helpers.request({
          method,
          url,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: payload,
          json: true,
          timeout,
        });

        returnData.push({
          json: {
            data: response || null,
            operation,
            id: response?.id || null,
            success: true,
            url,
            method,
            metadata: {
              timestamp: new Date().toISOString(),
            },
          },
          pairedItem: { item: i },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new NodeOperationError(
          this.getNode(),
          `Twenty CRM update failed: ${msg}`,
          { itemIndex: i },
        );
      }
    }

    return [returnData];
  }
}
