import {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class TwentyCrmApiCredential implements ICredentialType {
  name = "twentyCrmApi";
  displayName = "Twenty CRM API";
  documentationUrl = "https://docs.twenty.com";
  properties: INodeProperties[] = [
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://levinnovation.crm.agentyx.one/rest",
      required: true,
    },
    {
      displayName: "API Key (Bearer Token)",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
    },
  ];
}
