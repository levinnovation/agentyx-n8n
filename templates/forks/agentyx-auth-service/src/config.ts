import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),
  DATABASE_URL: z.string(),
  TRUSTED_ORIGINS: z.string().transform((s) => s.split(",")),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_HD: z.string().optional(),
  INTERNAL_API_KEY: z.string(),
});

export const config = envSchema.parse(process.env);
