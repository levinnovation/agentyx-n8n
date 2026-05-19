import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
  NodeOperationError,
} from "n8n-workflow";

export class AgentyxCRMQuery implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Agentyx CRM Query (Twenty)",
    name: "agentyxCRMQuery",
    icon: "file:AgentyxCRMQuery.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{ $parameter["operation"] }}',
    description:
      "Read-only queries against Twenty CRM: search people, companies, opportunities by email, name, or ID",
    defaults: {
      name: "Agentyx CRM Query",
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
          { name: "Search People by Email", value: "searchPeopleByEmail" },
          { name: "Search People by Name", value: "searchPeopleByName" },
          { name: "Search Companies by Name", value: "searchCompaniesByName" },
          { name: "Search Opportunities by Name", value: "searchOpportunitiesByName" },
          { name: "Get Person by ID", value: "getPersonById" },
          { name: "Get Company by ID", value: "getCompanyById" },
          { name: "Get Opportunity by ID", value: "getOpportunityById" },
          { name: "List People (recent)", value: "listPeople" },
          { name: "List Companies (recent)", value: "listCompanies" },
          { name: "List Opportunities (recent)", value: "listOpportunities" },
        ],
        default: "searchPeopleByEmail",
      },
      {
        displayName: "Query / ID",
        name: "query",
        type: "string",
        default: "={{ $json.resolved_email || $json.user_id }}",
        description: "Email, name, or ID to search. Supports expressions.",
      },
      {
        displayName: "Limit",
        name: "limit",
        type: "number",
        default: 10,
        description: "Maximum records to return",
      },
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "={{ $credentials.twentyCrmApi.baseUrl || 'https://levinnovation.crm.agentyx.one/rest' }}",
        description: "Twenty CRM REST base URL",
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
      const query = this.getNodeParameter("query", i) as string;
      const limit = this.getNodeParameter("limit", i) as number;
      const baseUrlParam = this.getNodeParameter("baseUrl", i, defaultBaseUrl) as string;
      const baseUrl = String(baseUrlParam || defaultBaseUrl).replace(/\/+$/, "");
      const timeout = this.getNodeParameter("timeout", i) as number;

      let url = "";
      switch (operation) {
        case "searchPeopleByEmail":
          url = `${baseUrl}/people?filter=${encodeURIComponent(`emails.primaryEmail[eq]:${query}`)}&limit=${limit}`;
          break;
        case "searchPeopleByName":
          url = `${baseUrl}/people?filter=${encodeURIComponent(`name[like]:${query}`)}&limit=${limit}`;
          break;
        case "searchCompaniesByName":
          url = `${baseUrl}/companies?filter=${encodeURIComponent(`name[eq]:${query}`)}&limit=${limit}`;
          break;
        case "searchOpportunitiesByName":
          url = `${baseUrl}/opportunities?filter=${encodeURIComponent(`name[eq]:${query}`)}&limit=${limit}`;
          break;
        case "getPersonById":
          url = `${baseUrl}/people/${query}`;
          break;
        case "getCompanyById":
          url = `${baseUrl}/companies/${query}`;
          break;
        case "getOpportunityById":
          url = `${baseUrl}/opportunities/${query}`;
          break;
        case "listPeople":
          url = `${baseUrl}/people?limit=${limit}`;
          break;
        case "listCompanies":
          url = `${baseUrl}/companies?limit=${limit}`;
          break;
        case "listOpportunities":
          url = `${baseUrl}/opportunities?limit=${limit}`;
          break;
        default:
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation: ${operation}`,
            { itemIndex: i },
          );
      }

      try {
        const response = await this.helpers.request({
          method: "GET",
          url,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          json: true,
          timeout,
        });

        returnData.push({
          json: {
            data: response?.data || response || [],
            operation,
            query,
            url,
            count: Array.isArray(response?.data) ? response.data.length : 1,
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
          `Twenty CRM query failed: ${msg}`,
          { itemIndex: i },
        );
      }
    }

    return [returnData];
  }
}
