"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentyxChannelFormattedInputNode = void 0;
class AgentyxChannelFormattedInputNode {
    description = {
        displayName: "Agentyx Channel Input",
        name: "agentyxChannelFormattedInputNode",
        icon: "file:AgentyxChannelFormattedInputNode.svg",
        group: ["transform"],
        version: 1,
        subtitle: '={{ $parameter["channel"] }}',
        description: "Normalize channel-specific payloads (Kapso WhatsApp, Telegram, Meta, LibreChat, Twenty Webhook) into a canonical envelope",
        defaults: {
            name: "Agentyx Channel Input",
        },
        inputs: ["main"],
        outputs: ["main"],
        properties: [
            {
                displayName: "Channel",
                name: "channel",
                type: "options",
                options: [
                    { name: "Kapso WhatsApp", value: "kapso-wa" },
                    { name: "Telegram", value: "telegram" },
                    { name: "Meta Comment", value: "meta-comment" },
                    { name: "LibreChat", value: "librechat" },
                    { name: "Twenty Webhook", value: "twenty-webhook" },
                    { name: "Generic / Custom", value: "generic" },
                ],
                default: "kapso-wa",
            },
            {
                displayName: "Payload (JSON)",
                name: "payload",
                type: "json",
                default: "={{ JSON.stringify($json) }}",
                description: "Raw incoming payload. Supports n8n expressions.",
            },
            {
                displayName: "Core Workflow ID",
                name: "coreWorkflowId",
                type: "string",
                default: "",
                description: "ID of the core workflow this input feeds into",
            },
            {
                displayName: "Deduplication TTL (minutes)",
                name: "dedupTtlMinutes",
                type: "number",
                default: 15,
                description: "Time window to detect duplicate message_ids. 0 = disabled. Uses $getWorkflowStaticData('global').",
                displayOptions: { show: { channel: ["kapso-wa", "telegram"] } },
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            const channel = this.getNodeParameter("channel", i);
            const payloadRaw = this.getNodeParameter("payload", i);
            const coreWorkflowId = this.getNodeParameter("coreWorkflowId", i);
            const dedupTtl = this.getNodeParameter("dedupTtlMinutes", i, 0);
            let raw = {};
            try {
                raw = JSON.parse(payloadRaw || "{}") || {};
            }
            catch {
                raw = { __raw: payloadRaw };
            }
            let envelope = {
                channel,
                core_workflow_id: coreWorkflowId,
                conversation_id: "",
                user_id: "",
                message: "",
                attachments: [],
                metadata: {},
            };
            switch (channel) {
                case "kapso-wa": {
                    const body = raw.body || raw || {};
                    const msg = body.message || {};
                    const conv = body.conversation || {};
                    let messageText = "";
                    const attachments = [];
                    if (msg.type === "text" && msg.text) {
                        const txt = msg.text;
                        messageText = txt.body || "";
                    }
                    else if (msg.type === "image" && msg.image) {
                        const img = msg.image;
                        messageText = img.caption || "[Imagen recibida]";
                        attachments.push({
                            type: "image",
                            url: img.link || "",
                            mime_type: img.mime_type || "image/jpeg",
                        });
                    }
                    else if (msg.type === "document" && msg.document) {
                        const doc = msg.document;
                        messageText = doc.caption || "[Documento recibido]";
                        attachments.push({
                            type: "document",
                            url: doc.link || "",
                            mime_type: doc.mime_type || "application/pdf",
                        });
                    }
                    else if (msg.type === "voice" && msg.voice) {
                        const voice = msg.voice;
                        messageText = "[Mensaje de voz recibido]";
                        attachments.push({
                            type: "voice",
                            url: voice.link || "",
                            mime_type: voice.mime_type || "audio/ogg",
                        });
                    }
                    else if (msg.type === "audio" && msg.audio) {
                        const audio = msg.audio;
                        messageText = "[Audio recibido]";
                        attachments.push({
                            type: "audio",
                            url: audio.link || "",
                            mime_type: audio.mime_type || "audio/mpeg",
                        });
                    }
                    else if (msg.type === "interactive" && msg.interactive) {
                        const interactive = msg.interactive;
                        if (interactive.type === "button_reply") {
                            const btn = interactive.button_reply;
                            messageText = `[Button: ${btn.title || ""}]`;
                            envelope = { ...envelope, selection_id: btn.id, selection_title: btn.title, input_type: "button" };
                        }
                        else if (interactive.type === "list_reply") {
                            const list = interactive.list_reply;
                            messageText = `[List: ${list.title || ""}]`;
                            envelope = { ...envelope, selection_id: list.id, selection_title: list.title, input_type: "list" };
                        }
                    }
                    const phoneRaw = String(conv.phone_number || msg.from || "");
                    const phoneDigits = phoneRaw.replace(/\D/g, "");
                    const phoneNumber = phoneDigits ? `+${phoneDigits}` : "";
                    envelope = {
                        ...envelope,
                        conversation_id: String(conv.id || msg.from || ""),
                        user_id: phoneNumber,
                        message: messageText,
                        attachments,
                        metadata: {
                            message_id: msg.id || "",
                            contact_name: conv.contact_name || "",
                            phone_number_id: conv.phone_number_id || "",
                            platform: "whatsapp",
                        },
                    };
                    break;
                }
                case "telegram": {
                    const body = raw.body || raw || {};
                    const msg = body.message || {};
                    const from = msg.from || {};
                    const chat = msg.chat || {};
                    const text = String(msg.text || msg.caption || "");
                    const attachments = [];
                    if (msg.photo && Array.isArray(msg.photo)) {
                        const photos = msg.photo;
                        const largest = photos[photos.length - 1];
                        attachments.push({
                            type: "image",
                            url: String(largest?.file_id || ""),
                            mime_type: "image/jpeg",
                        });
                    }
                    if (msg.document) {
                        const doc = msg.document;
                        attachments.push({
                            type: "document",
                            url: doc.file_id || "",
                            mime_type: doc.mime_type || "application/octet-stream",
                        });
                    }
                    if (msg.voice) {
                        const voice = msg.voice;
                        attachments.push({
                            type: "voice",
                            url: voice.file_id || "",
                            mime_type: voice.mime_type || "audio/ogg",
                        });
                    }
                    envelope = {
                        ...envelope,
                        conversation_id: String(chat.id || ""),
                        user_id: String(from.id || ""),
                        message: text,
                        attachments,
                        metadata: {
                            update_id: String(body.update_id || ""),
                            message_id: String(msg.message_id || ""),
                            username: String(from.username || ""),
                            first_name: String(from.first_name || ""),
                            chat_id: String(chat.id || ""),
                            platform: "telegram",
                        },
                    };
                    break;
                }
                case "meta-comment": {
                    const body = raw.body || raw || {};
                    const payload = body.payload || body;
                    const commentText = String(payload.message || payload.comment_text || payload.text || "");
                    const commentId = String(payload.comment_id || payload.id || "");
                    const postId = String(payload.post_id || payload.object_id || "");
                    const pageId = String(payload.page_id || payload.recipient_id || "");
                    const senderName = String(payload.sender_name || payload.from?.name || "Usuario");
                    const senderId = String(payload.sender_id || payload.from?.id || "");
                    const platform = String(payload.platform ||
                        (payload.object === "instagram" ? "instagram" : "facebook"));
                    envelope = {
                        ...envelope,
                        conversation_id: `${pageId}:${postId}:${commentId}`,
                        user_id: senderId,
                        message: commentText,
                        attachments: [],
                        metadata: {
                            comment_id: commentId,
                            post_id: postId,
                            page_id: pageId,
                            platform,
                            sender_name: senderName,
                            sender_id: senderId,
                        },
                    };
                    break;
                }
                case "librechat": {
                    const body = raw.body || raw || {};
                    envelope = {
                        ...envelope,
                        conversation_id: String(body.conversation_id || ""),
                        user_id: String(body.user_id || ""),
                        message: String(body.message || ""),
                        attachments: Array.isArray(body.attachments) ? body.attachments : [],
                        metadata: typeof body.metadata === "object" && body.metadata !== null
                            ? body.metadata
                            : {},
                    };
                    break;
                }
                case "twenty-webhook": {
                    const input = raw;
                    const headers = input.headers || {};
                    const body = input.body || input;
                    const event = String(body.event || body.type || "unknown.created");
                    const record = body.record || {};
                    const parts = event.includes(".") ? event.split(".") : ["unknown", "created"];
                    envelope = {
                        ...envelope,
                        conversation_id: String(record.id || ""),
                        user_id: String(record.createdById || ""),
                        message: `Twenty ${parts[0]} ${parts[1]}`,
                        attachments: [],
                        metadata: {
                            event,
                            object_type: parts[0],
                            action: parts[1],
                            record,
                            timestamp: String(headers["x-twenty-webhook-timestamp"] || ""),
                            signature: String(headers["x-twenty-webhook-signature"] || ""),
                        },
                    };
                    break;
                }
                case "generic":
                default: {
                    envelope = {
                        ...envelope,
                        conversation_id: String(raw.conversation_id || raw.id || ""),
                        user_id: String(raw.user_id || raw.from || ""),
                        message: String(raw.message || raw.text || ""),
                        attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
                        metadata: typeof raw.metadata === "object" && raw.metadata !== null
                            ? raw.metadata
                            : raw,
                    };
                    break;
                }
            }
            // Deduplication if enabled
            let duplicateMessage = false;
            if (dedupTtl > 0 && envelope.metadata && envelope.metadata.message_id) {
                try {
                    // n8n static data access
                    const messageId = String(envelope.metadata.message_id || "");
                    // Note: In a real node, we'd use $getWorkflowStaticData, but that's not available
                    // in custom nodes the same way. We'll store dedup state in the node static data.
                    const staticData = this.getWorkflowStaticData("global");
                    const seen = staticData.seenMessageIds || {};
                    const now = Date.now();
                    const ttlMs = dedupTtl * 60 * 1000;
                    // Cleanup old entries
                    for (const [key, ts] of Object.entries(seen)) {
                        if (typeof ts !== "number" || now - ts > ttlMs) {
                            delete seen[key];
                        }
                    }
                    if (messageId && seen[messageId]) {
                        duplicateMessage = true;
                    }
                    else if (messageId) {
                        seen[messageId] = now;
                    }
                    staticData.seenMessageIds = seen;
                }
                catch {
                    // dedup disabled if static data unavailable
                }
            }
            const atts = (envelope.attachments || []);
            const env = envelope;
            returnData.push({
                json: {
                    ...envelope,
                    // Standard data contract (Agentyx Sub-Workflow Library v2)
                    sender: env.user_id,
                    thread_id: env.conversation_id,
                    has_image: atts.length > 0 && atts.some((a) => ["image", "photo"].includes(a.type)),
                    image_url: atts.find((a) => ["image", "photo"].includes(a.type))?.url || null,
                    transcript: atts.some((a) => ["voice", "audio"].includes(a.type))
                        ? atts.find((a) => ["voice", "audio"].includes(a.type))?.url || null
                        : null,
                    duplicate_message: duplicateMessage,
                },
                pairedItem: { item: i },
            });
        }
        return [returnData];
    }
}
exports.AgentyxChannelFormattedInputNode = AgentyxChannelFormattedInputNode;
