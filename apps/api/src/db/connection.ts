import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { getDatabaseConfig } from "../config/database.js";
import * as schema from "./schema.js";

export function createDatabaseConnection(databaseUrl = getDatabaseConfig().databaseUrl) {
  const pool = new pg.Pool({
    connectionString: databaseUrl
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async close() {
      await pool.end();
    }
  };
}

export type Database = ReturnType<typeof createDatabaseConnection>["db"];
