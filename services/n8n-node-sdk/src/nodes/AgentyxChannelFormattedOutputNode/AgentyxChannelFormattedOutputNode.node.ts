import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
  NodeOperationError,
  IHttpRequestMethods,
  IDataObject,
} from "n8n-workflow";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function splitByLimit(text: string, maxLen: number): string[] {
  if (!text || text.length <= maxLen) return [text];
  const parts: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";

  const flush = () => {
    if (current.trim()) parts.push(current.trim());
    current = "";
  };

  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }
    if (current) flush();
    if (p.length <= maxLen) current = p;
    else {
      for (let i = 0; i < p.length; i += maxLen) {
        parts.push(p.slice(i, i + maxLen));
      }
    }
  }
  flush();
  return parts;
}

function formatSlackBlocks(text: string): unknown[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: text.slice(0, 3000) },
    },
  ];
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<b>$1</b>")
    .replace(/\*(.*)\*/gim, "<i>$1</i>")
    .replace(/\n/gim, "<br>");
}

export class AgentyxChannelFormattedOutputNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Agentyx Channel Output",
    name: "agentyxChannelFormattedOutputNode",
    icon: "file:AgentyxChannelFormattedOutputNode.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{ $parameter["channel"] }}',
    description:
      "Format and send replies to Kapso WhatsApp, Telegram, Slack, or email with channel-specific formatting rules",
    defaults: {
      name: "Agentyx Channel Output",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      { name: "kapsoApi", required: false },
      { name: "telegramBot", required: false },
      { name: "slackApi", required: false },
    ],
    properties: [
      {
        displayName: "Channel",
        name: "channel",
        type: "options",
        options: [
          { name: "Kapso WhatsApp", value: "kapso-wa" },
          { name: "Telegram", value: "telegram" },
          { name: "Slack", value: "slack" },
          { name: "Email (Resend)", value: "email" },
          { name: "Generic / Custom", value: "generic" },
        ],
        default: "kapso-wa",
      },
      {
        displayName: "Reply Text",
        name: "replyText",
        type: "string",
        typeOptions: { rows: 5 },
        default: "={{ $json.reply_text || $json.message }}",
        description: "The text to send. Reads from 'reply_text' or standard contract 'message' field.",
      },
      {
        displayName: "Recipient ID",
        name: "recipientId",
        type: "string",
        default: "={{ $json.recipient_id || $json.sender || $json.user_id }}",
        description: "Phone number (WA), chat_id (Telegram), etc. Reads from 'recipient_id', 'sender', or 'user_id'.",
      },
      {
        displayName: "Reply Attachments (JSON)",
        name: "replyAttachments",
        type: "json",
        default: "[]",
        description: "Array of {type, url} attachments to include",
      },
      {
        displayName: "Parse Mode",
        name: "parseMode",
        type: "options",
        options: [
          { name: "HTML", value: "HTML" },
          { name: "Markdown", value: "Markdown" },
          { name: "None", value: "None" },
        ],
        default: "HTML",
        displayOptions: { show: { channel: ["telegram", "slack"] } },
      },
      {
        displayName: "Email Subject",
        name: "emailSubject",
        type: "string",
        default: "",
        displayOptions: { show: { channel: ["email"] } },
      },
      {
        displayName: "Email To",
        name: "emailTo",
        type: "string",
        default: "",
        displayOptions: { show: { channel: ["email"] } },
      },
      {
        displayName: "Disable Web Page Preview",
        name: "disablePreview",
        type: "boolean",
        default: true,
        displayOptions: { show: { channel: ["telegram"] } },
      },
      {
        displayName: "Send Method",
        name: "sendMethod",
        type: "options",
        options: [
          { name: "Return Payload Only", value: "payload" },
          { name: "Send via API", value: "api" },
        ],
        default: "api",
        description:
          "payload = return the formatted payload for downstream HTTP node. api = send directly.",
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

    for (let i = 0; i < items.length; i++) {
      const channel = this.getNodeParameter("channel", i) as string;
      const replyText = this.getNodeParameter("replyText", i) as string;
      const recipientId = this.getNodeParameter("recipientId", i) as string;
      const attachmentsRaw = this.getNodeParameter("replyAttachments", i) as string;
      const sendMethod = this.getNodeParameter("sendMethod", i) as string;
      const timeout = this.getNodeParameter("timeout", i) as number;

      let attachments: Array<Record<string, string>> = [];
      try {
        attachments = JSON.parse(attachmentsRaw || "[]");
      } catch {
        attachments = [];
      }

      let payload: IDataObject = {};
      let apiUrl = "";
      let method: IHttpRequestMethods = "POST";
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      let requestBody: IDataObject = {};

      switch (channel) {
        case "kapso-wa": {
          const kapsoCreds = await this.getCredentials("kapsoApi");
          const baseUrl = String(kapsoCreds.baseUrl || "https://api.kapso.ai");
          const apiKey = String(kapsoCreds.apiKey || "");
          const phoneNumberId = String(kapsoCreds.phoneNumberId || "1169330222921278");

          const phoneDigits = recipientId.replace(/\D/g, "");
          const cleanText = String(replyText || "").slice(0, 4096);

          // Build Kapso WhatsApp Cloud API payload
          payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneDigits,
            type: "text",
            text: { body: cleanText },
          };

          // If attachments exist, switch to media type
          if (attachments.length > 0) {
            const att = attachments[0];
            if (att.type === "image") {
              payload.type = "image";
              payload.image = { link: att.url, caption: cleanText };
              delete payload.text;
            } else if (att.type === "document") {
              payload.type = "document";
              payload.document = { link: att.url, caption: cleanText };
              delete payload.text;
            }
          }

          apiUrl = `${baseUrl.replace(/\/+$/, "")}/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
          headers["X-API-Key"] = apiKey;
          break;
        }

        case "telegram": {
          const telegramCreds = await this.getCredentials("telegramBot");
          const botToken = String(telegramCreds.botToken || "");
          const baseUrl = String(telegramCreds.baseUrl || "https://api.telegram.org");
          const parseMode = this.getNodeParameter("parseMode", i) as string;
          const disablePreview = this.getNodeParameter("disablePreview", i) as boolean;

          // HTML-escape and split if needed
          let cleanText = escapeHtml(replyText || "");
          cleanText = cleanText.replace(/^\s*\*\s{2,}/gm, "• ").replace(/^\s*\*\s+/gm, "• ");

          // Split by 4096 char limit
          const chunks = splitByLimit(cleanText, 4096);

          payload = {
            chat_id: Number(recipientId) || 0,
            text: chunks[0] || "",
            parse_mode: parseMode,
            disable_web_page_preview: disablePreview,
          };

          apiUrl = `${baseUrl}/bot${botToken}/sendMessage`;

          // If document attachment
          if (attachments.length > 0 && attachments[0].type === "document") {
            payload = {
              chat_id: Number(recipientId) || 0,
              document: attachments[0].url,
              caption: chunks[0] || "",
              parse_mode: parseMode,
            };
            apiUrl = `${baseUrl}/bot${botToken}/sendDocument`;
          }
          break;
        }

        case "slack": {
          payload = {
            channel: recipientId,
            text: replyText,
            blocks: formatSlackBlocks(replyText),
          };
          apiUrl = "https://slack.com/api/chat.postMessage";
          // Slack token would come from credentials or env
          break;
        }

        case "email": {
          const subject = this.getNodeParameter("emailSubject", i) as string;
          const to = this.getNodeParameter("emailTo", i) as string;
          payload = {
            to,
            subject,
            html: markdownToHtml(replyText),
            text: replyText,
          };
          // Email sending would use Resend or SMTP downstream
          break;
        }

        case "generic":
        default: {
          payload = {
            recipient_id: recipientId,
            message: replyText,
            attachments,
          };
          break;
        }
      }

      let sent = false;
      let error: string | null = null;
      let responseData: IDataObject = {};

      if (sendMethod === "api" && apiUrl) {
        try {
          requestBody = payload;
          responseData = await this.helpers.request({
            method,
            url: apiUrl,
            headers,
            body: requestBody as any,
            json: true,
            timeout,
          });
          sent = true;
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
        }
      }

      returnData.push({
        json: {
          channel,
          recipient_id: recipientId,
          sent,
          error,
          payload,
          response: responseData,
          api_url: apiUrl,
          method: sendMethod,
          metadata: {
            timestamp: new Date().toISOString(),
            text_length: replyText?.length || 0,
            attachment_count: attachments.length,
          },
        },
        pairedItem: { item: i },
      });
    }

    return [returnData];
  }
}
