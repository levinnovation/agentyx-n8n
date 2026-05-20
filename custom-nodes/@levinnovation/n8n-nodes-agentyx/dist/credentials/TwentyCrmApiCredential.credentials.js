"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwentyCrmApiCredential = void 0;
class TwentyCrmApiCredential {
    name = "twentyCrmApi";
    displayName = "Twenty CRM API";
    documentationUrl = "https://docs.twenty.com";
    properties = [
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
exports.TwentyCrmApiCredential = TwentyCrmApiCredential;
