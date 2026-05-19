import {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class RedisCredential implements ICredentialType {
  name = "redisAccount";
  displayName = "Redis Account";
  documentationUrl = "https://redis.io/docs";
  properties: INodeProperties[] = [
    {
      displayName: "Host",
      name: "host",
      type: "string",
      default: "",
      required: true,
    },
    {
      displayName: "Port",
      name: "port",
      type: "number",
      default: 6379,
    },
    {
      displayName: "Password",
      name: "password",
      type: "string",
      typeOptions: { password: true },
      default: "",
    },
    {
      displayName: "Database",
      name: "database",
      type: "number",
      default: 0,
    },
  ];
}
