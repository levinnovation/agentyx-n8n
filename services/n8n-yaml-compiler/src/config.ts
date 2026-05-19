import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(JSON.stringify({ level: "error", msg: "missing_required_env", name }));
    process.exit(1);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  n8nApiUrl: requireEnv("N8N_API_URL"),
  n8nApiKey: requireEnv("N8N_API_KEY"),
  n8nEncryptionKey: requireEnv("N8N_ENCRYPTION_KEY"),
  n8nVersion: process.env.N8N_VERSION ?? "unknown",

  dbHost: requireEnv("DB_HOST"),
  dbPort: parseInt(process.env.DB_PORT ?? "5432", 10),
  dbUser: requireEnv("DB_USER"),
  dbPassword: requireEnv("DB_PASSWORD"),
  dbDatabase: requireEnv("DB_DATABASE"),
  dbSchema: process.env.DB_SCHEMA ?? "n8n",

  auditSchema: process.env.AUDIT_SCHEMA ?? "agentyx_audit",
  compilerToken: requireEnv("COMPILER_TOKEN"),
};
