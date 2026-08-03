import type { AbuseControlConfig } from "../config/abuse-control.js";
import type { PostgresRepositories } from "../persistence/postgres/repositories.js";
import type { Clock } from "./guest-session.js";

export type BurstGuardResult =
  | { allowed: true }
  | { allowed: false; kind: "rate_limited"; retryAfterSeconds: number };

export type QuotaGuardResult =
  | { allowed: true }
  | { allowed: false; kind: "mutation_quota" | "reset_quota" };

export class GuestSessionUsageUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Guest session usage persistence is unavailable.");
    this.name = "GuestSessionUsageUnavailableError";
    this.cause = cause;
  }
}

export class GuestSessionUsageService {
  constructor(
    private readonly repositories: PostgresRepositories,
    private readonly config: AbuseControlConfig,
    private readonly clock: Clock = systemClock
  ) {}

  async consumeBurst(guestSessionId: string): Promise<BurstGuardResult> {
    const result = await mapUsagePersistenceFailure(() =>
      this.repositories.transaction((transactionalRepositories) =>
        transactionalRepositories.guestSessionUsage.consumeBurst({
          guestSessionId,
          limit: this.config.rateMaxRequests,
          now: this.clock.now(),
          windowSeconds: this.config.rateWindowSeconds
        })
      )
    );

    return result.allowed
      ? { allowed: true }
      : {
          allowed: false,
          kind: "rate_limited",
          retryAfterSeconds: result.retryAfterSeconds
        };
  }

  async consumeMutationQuota(
    repositories: PostgresRepositories,
    guestSessionId: string
  ): Promise<QuotaGuardResult> {
    const result = await mapUsagePersistenceFailure(() =>
      repositories.guestSessionUsage.consumeMutationQuota({
        guestSessionId,
        limit: this.config.mutationLimit
      })
    );

    return result.allowed
      ? { allowed: true }
      : { allowed: false, kind: "mutation_quota" };
  }

  async consumeResetQuota(
    repositories: PostgresRepositories,
    guestSessionId: string
  ): Promise<QuotaGuardResult> {
    const result = await mapUsagePersistenceFailure(() =>
      repositories.guestSessionUsage.consumeResetQuota({
        guestSessionId,
        mutationLimit: this.config.mutationLimit,
        resetLimit: this.config.resetLimit
      })
    );

    return result.allowed
      ? { allowed: true }
      : {
          allowed: false,
          kind: result.reason === "reset_quota" ? "reset_quota" : "mutation_quota"
        };
  }
}

const systemClock: Clock = {
  now() {
    return new Date();
  }
};

async function mapUsagePersistenceFailure<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof GuestSessionUsageUnavailableError) {
      throw error;
    }

    throw new GuestSessionUsageUnavailableError(error);
  }
}
