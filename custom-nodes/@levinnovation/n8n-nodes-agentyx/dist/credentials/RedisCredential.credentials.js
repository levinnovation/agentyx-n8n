"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCredential = void 0;
class RedisCredential {
    name = "redisAccount";
    displayName = "Redis Account";
    documentationUrl = "https://redis.io/docs";
    properties = [
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
exports.RedisCredential = RedisCredential;
