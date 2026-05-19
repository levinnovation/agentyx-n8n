import {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class KapsoApiCredential implements ICredentialType {
  name = "kapsoApi";
  displayName = "Kapso API";
  documentationUrl = "https://docs.kapso.ai";
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.kapso.ai",
      required: true,
    },
    {
      displayName: "Phone Number ID",
      name: "phoneNumberId",
      type: "string",
      default: "",
      description: "WhatsApp phone number ID for outbound messages",
    },
  ];
}
