import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("3000"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_HD: z.string().optional(),
  OIDC_ISSUER: z.string().optional(),
  OIDC_JWKS_PRIVATE_KEY: z.string().optional(),
  INTERNAL_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("[better-auth] Config validation failed:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = {
  port: parseInt(parsed.data.PORT, 10),
  betterAuthSecret: parsed.data.BETTER_AUTH_SECRET,
  betterAuthUrl: parsed.data.BETTER_AUTH_URL,
  databaseUrl: parsed.data.DATABASE_URL,
  trustedOrigins: parsed.data.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) || [],
  googleClientId: parsed.data.GOOGLE_OAUTH_CLIENT_ID || "",
  googleClientSecret: parsed.data.GOOGLE_OAUTH_CLIENT_SECRET || "",
  googleHd: parsed.data.GOOGLE_HD || "",
  oidcIssuer: parsed.data.OIDC_ISSUER || parsed.data.BETTER_AUTH_URL,
  oidcJwksPrivateKey: parsed.data.OIDC_JWKS_PRIVATE_KEY || "",
  internalApiKey: parsed.data.INTERNAL_API_KEY || "",
};
