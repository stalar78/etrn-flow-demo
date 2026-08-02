import { z } from "zod";

const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL")
});

export type DatabaseConfig = {
  databaseUrl: string;
};

export function getDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const parsed = databaseConfigSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Database configuration is invalid: ${issues}`);
  }

  return {
    databaseUrl: parsed.data.DATABASE_URL
  };
}
