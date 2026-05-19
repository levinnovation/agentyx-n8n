import {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class AgentyxApiCredential implements ICredentialType {
  name = "agentyxApi";
  displayName = "Agentyx API";
  documentationUrl = "https://docs.agentyx.io";
  properties: INodeProperties[] = [
    {
      displayName: "Compiler URL",
      name: "compilerUrl",
      type: "string",
      default: "",
      placeholder: "https://compiler.levinnovation.internal",
    },
    {
      displayName: "Compiler Token",
      name: "compilerToken",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
    },
  ];
}
