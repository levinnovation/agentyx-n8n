import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  betterAuthSecret: process.env.BETTER_AUTH_SECRET!,
  betterAuthUrl: process.env.BETTER_AUTH_URL!,
  databaseUrl: process.env.BETTER_AUTH_DATABASE_URL!,
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") || [],
  googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
  googleHd: process.env.GOOGLE_HD || "",
  oidcIssuer: process.env.OIDC_ISSUER || process.env.BETTER_AUTH_URL!,
  oidcJwksPrivateKey: process.env.OIDC_JWKS_PRIVATE_KEY || "",
};
