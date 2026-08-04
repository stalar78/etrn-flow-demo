import { createDatabaseConnection } from "./connection.js";
import { createPostgresRepositories } from "../persistence/postgres/repositories.js";
import { GuestSessionCleanupService } from "../services/guest-session-cleanup.js";

const connection = createDatabaseConnection();

try {
  const repositories = createPostgresRepositories(connection.db);
  const service = new GuestSessionCleanupService(repositories);
  const result = await service.cleanupExpiredGuestSessions();

  console.log(
    `Expired guest-session cleanup completed: deleted=${result.deletedSessionCount}, batches=${result.completedBatchCount}, safetyLimitReached=${result.safetyLimitReached}`
  );
} catch (error) {
  const message = safeCleanupErrorMessage(error);
  console.error(`Expired guest-session cleanup failed: ${message}`);
  process.exitCode = 1;
} finally {
  await connection.close();
}

function safeCleanupErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "unknown error";
  }

  if (containsSensitiveFragment(error.message)) {
    return error.name;
  }

  return error.message;
}

function containsSensitiveFragment(message: string) {
  return /postgres:\/\/|password|cookie|session|shipment/i.test(message);
}
