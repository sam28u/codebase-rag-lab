import { config } from "dotenv";
import { resolve } from "node:path";
import type { Config } from "drizzle-kit";

// When you run `pnpm generate` / `pnpm migrate`, cwd is packages/db.
// So ../../.env resolves to the repo root.
config({ path: resolve(process.cwd(), "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env at the repo root.");
}

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
} satisfies Config;