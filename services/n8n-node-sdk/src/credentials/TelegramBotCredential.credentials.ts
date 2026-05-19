import {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class TelegramBotCredential implements ICredentialType {
  name = "telegramBot";
  displayName = "Telegram Bot";
  documentationUrl = "https://core.telegram.org/bots/api";
  properties: INodeProperties[] = [
    {
      displayName: "Bot Token",
      name: "botToken",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
    },
    {
      displayName: "API Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.telegram.org",
      required: true,
    },
  ];
}
