"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentyxApiCredential = void 0;
class AgentyxApiCredential {
    name = "agentyxApi";
    displayName = "Agentyx API";
    documentationUrl = "https://docs.agentyx.io";
    properties = [
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
exports.AgentyxApiCredential = AgentyxApiCredential;
