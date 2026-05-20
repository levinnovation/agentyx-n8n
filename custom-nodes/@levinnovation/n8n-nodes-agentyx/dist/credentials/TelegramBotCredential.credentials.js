"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBotCredential = void 0;
class TelegramBotCredential {
    name = "telegramBot";
    displayName = "Telegram Bot";
    documentationUrl = "https://core.telegram.org/bots/api";
    properties = [
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
exports.TelegramBotCredential = TelegramBotCredential;
