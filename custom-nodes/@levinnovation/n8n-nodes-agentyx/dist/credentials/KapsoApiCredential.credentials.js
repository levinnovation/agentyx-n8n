"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KapsoApiCredential = void 0;
class KapsoApiCredential {
    name = "kapsoApi";
    displayName = "Kapso API";
    documentationUrl = "https://docs.kapso.ai";
    properties = [
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
exports.KapsoApiCredential = KapsoApiCredential;
