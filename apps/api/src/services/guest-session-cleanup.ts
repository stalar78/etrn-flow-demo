import type { PostgresRepositories } from "../persistence/postgres/repositories.js";

export const GUEST_SESSION_CLEANUP_GRACE_HOURS = 24;
export const GUEST_SESSION_CLEANUP_BATCH_SIZE = 500;
export const GUEST_SESSION_CLEANUP_MAX_BATCHES = 100;
export const GUEST_SESSION_CLEANUP_MAX_DELETIONS =
  GUEST_SESSION_CLEANUP_BATCH_SIZE * GUEST_SESSION_CLEANUP_MAX_BATCHES;

export type GuestSessionCleanupOptions = {
  batchSize?: number;
  maxBatches?: number;
};

export type GuestSessionCleanupResult = {
  deletedSessionCount: number;
  completedBatchCount: number;
  safetyLimitReached: boolean;
};

export class GuestSessionCleanupService {
  private readonly batchSize: number;
  private readonly maxBatches: number;

  constructor(
    private readonly repositories: PostgresRepositories,
    options: GuestSessionCleanupOptions = {}
  ) {
    this.batchSize = options.batchSize ?? GUEST_SESSION_CLEANUP_BATCH_SIZE;
    this.maxBatches = options.maxBatches ?? GUEST_SESSION_CLEANUP_MAX_BATCHES;
  }

  async cleanupExpiredGuestSessions(): Promise<GuestSessionCleanupResult> {
    let deletedSessionCount = 0;
    let completedBatchCount = 0;

    for (let batchNumber = 0; batchNumber < this.maxBatches; batchNumber += 1) {
      const deletedInBatch =
        await this.repositories.guestSessionCleanup.deleteExpiredGuestSessionsBatch({
          batchSize: this.batchSize
        });

      deletedSessionCount += deletedInBatch;
      completedBatchCount += 1;

      if (deletedInBatch < this.batchSize) {
        return {
          deletedSessionCount,
          completedBatchCount,
          safetyLimitReached: false
        };
      }
    }

    return {
      deletedSessionCount,
      completedBatchCount,
      safetyLimitReached: true
    };
  }
}
