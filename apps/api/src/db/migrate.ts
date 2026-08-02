import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabaseConnection } from "./connection.js";

const connection = createDatabaseConnection();

try {
  await migrate(connection.db, {
    migrationsFolder: "drizzle"
  });
} finally {
  await connection.close();
}
