import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.BETTER_AUTH_DATABASE_URL || "postgresql://postgres:ArPqjuKvGpZIOHcrrNIEUujKrWtMIYdz@shinkansen.proxy.rlwy.net:17964/auth",
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || "test",
  emailAndPassword: {
    enabled: true,
  },
});
