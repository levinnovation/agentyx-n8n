"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterApiCredential = void 0;
class OpenRouterApiCredential {
    name = "openrouterApi";
    displayName = "OpenRouter API";
    documentationUrl = "https://openrouter.ai/docs";
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
            displayName: "HTTP Referer",
            name: "httpReferer",
            type: "string",
            default: "https://levinnovation.com",
            description: "Site URL for OpenRouter rankings",
        },
        {
            displayName: "Title",
            name: "title",
            type: "string",
            default: "Lev Innovation Agent",
            description: "App title for OpenRouter rankings",
        },
    ];
}
exports.OpenRouterApiCredential = OpenRouterApiCredential;
