import { describe, expect, it, vi } from "vitest";

import type { PostgresRepositories } from "../persistence/postgres/repositories.js";
import { GuestSessionCleanupService } from "./guest-session-cleanup.js";

describe("GuestSessionCleanupService", () => {
  it("returns zero deletions when the first batch is empty", async () => {
    const repositories = createRepositoryStub([0]);
    const service = new GuestSessionCleanupService(repositories);

    await expect(service.cleanupExpiredGuestSessions()).resolves.toEqual({
      deletedSessionCount: 0,
      completedBatchCount: 1,
      safetyLimitReached: false
    });
  });

  it("stops after one partial batch", async () => {
    const repositories = createRepositoryStub([125]);
    const service = new GuestSessionCleanupService(repositories);

    await expect(service.cleanupExpiredGuestSessions()).resolves.toEqual({
      deletedSessionCount: 125,
      completedBatchCount: 1,
      safetyLimitReached: false
    });
    expect(
      repositories.guestSessionCleanup.deleteExpiredGuestSessionsBatch
    ).toHaveBeenCalledTimes(1);
  });

  it("aggregates multiple full batches followed by a partial batch", async () => {
    const repositories = createRepositoryStub([500, 500, 125]);
    const service = new GuestSessionCleanupService(repositories);

    await expect(service.cleanupExpiredGuestSessions()).resolves.toEqual({
      deletedSessionCount: 1125,
      completedBatchCount: 3,
      safetyLimitReached: false
    });
  });

  it("reports the safety limit when every allowed batch is full", async () => {
    const repositories = createRepositoryStub(Array.from({ length: 100 }, () => 500));
    const service = new GuestSessionCleanupService(repositories);

    await expect(service.cleanupExpiredGuestSessions()).resolves.toEqual({
      deletedSessionCount: 50000,
      completedBatchCount: 100,
      safetyLimitReached: true
    });
  });

  it("passes the configured test batch size to the repository", async () => {
    const repositories = createRepositoryStub([2, 1]);
    const service = new GuestSessionCleanupService(repositories, {
      batchSize: 2,
      maxBatches: 10
    });

    await service.cleanupExpiredGuestSessions();

    expect(
      repositories.guestSessionCleanup.deleteExpiredGuestSessionsBatch
    ).toHaveBeenNthCalledWith(1, { batchSize: 2 });
    expect(
      repositories.guestSessionCleanup.deleteExpiredGuestSessionsBatch
    ).toHaveBeenNthCalledWith(2, { batchSize: 2 });
  });

  it("propagates repository errors", async () => {
    const repositories = createRepositoryStub([new Error("database unavailable")]);
    const service = new GuestSessionCleanupService(repositories);

    await expect(service.cleanupExpiredGuestSessions()).rejects.toThrow(
      "database unavailable"
    );
  });

  it("returns only aggregate cleanup data", async () => {
    const repositories = createRepositoryStub([1]);
    const service = new GuestSessionCleanupService(repositories);

    const result = await service.cleanupExpiredGuestSessions();

    expect(Object.keys(result).sort()).toEqual([
      "completedBatchCount",
      "deletedSessionCount",
      "safetyLimitReached"
    ]);
    expect(JSON.stringify(result)).not.toContain("id");
  });
});

function createRepositoryStub(results: Array<number | Error>) {
  const repositories = {
    guestSessionCleanup: {
      deleteExpiredGuestSessionsBatch: vi.fn(async () => {
        const result = results.shift() ?? 0;

        if (result instanceof Error) {
          throw result;
        }

        return result;
      })
    }
  } as unknown as PostgresRepositories;

  return repositories;
}
