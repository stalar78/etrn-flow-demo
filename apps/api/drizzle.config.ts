import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const databaseUrl = z
  .string()
  .url("DATABASE_URL must be a valid PostgreSQL URL")
  .parse(process.env.DATABASE_URL);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl
  }
});
