import { describe, expect, it, vi } from "vitest";

import type { GuestSessionRepository } from "@etrn-flow/domain";

import type { AbuseControlConfig } from "../config/abuse-control.js";
import type { PostgresRepositories } from "../persistence/postgres/repositories.js";
import {
  GuestSessionUsageService,
  GuestSessionUsageUnavailableError
} from "./guest-session-usage.js";

const config: AbuseControlConfig = {
  mutationLimit: 2,
  resetLimit: 1,
  rateWindowSeconds: 10,
  rateMaxRequests: 2
};

describe("GuestSessionUsageService", () => {
  it("passes burst consumption through a short transaction with the configured clock", async () => {
    const now = new Date("2026-08-03T10:00:00.000Z");
    const repositories = createRepositoryStub();
    const service = new GuestSessionUsageService(repositories, config, { now: () => now });

    await expect(service.consumeBurst("session-1")).resolves.toEqual({ allowed: true });

    expect(repositories.guestSessionUsage.consumeBurst).toHaveBeenCalledWith({
      guestSessionId: "session-1",
      limit: 2,
      now,
      windowSeconds: 10
    });
  });

  it("maps burst rejection with retry-after seconds", async () => {
    const repositories = createRepositoryStub({
      burstResult: { allowed: false, retryAfterSeconds: 7 }
    });
    const service = new GuestSessionUsageService(repositories, config);

    await expect(service.consumeBurst("session-1")).resolves.toEqual({
      allowed: false,
      kind: "rate_limited",
      retryAfterSeconds: 7
    });
  });

  it("maps lifetime mutation and reset quota rejections", async () => {
    const repositories = createRepositoryStub({
      mutationResult: { allowed: false, reason: "mutation_quota" },
      resetResult: { allowed: false, reason: "reset_quota" }
    });
    const service = new GuestSessionUsageService(repositories, config);

    await expect(service.consumeMutationQuota(repositories, "session-1")).resolves.toEqual({
      allowed: false,
      kind: "mutation_quota"
    });
    await expect(service.consumeResetQuota(repositories, "session-1")).resolves.toEqual({
      allowed: false,
      kind: "reset_quota"
    });
  });

  it("maps burst repository failures to a usage unavailable error", async () => {
    const repositories = createRepositoryStub({
      burstError: new Error("database unavailable")
    });
    const service = new GuestSessionUsageService(repositories, config);

    await expect(service.consumeBurst("session-1")).rejects.toBeInstanceOf(
      GuestSessionUsageUnavailableError
    );
  });

  it("maps mutation quota repository failures to a usage unavailable error", async () => {
    const repositories = createRepositoryStub({
      mutationError: new Error("database unavailable")
    });
    const service = new GuestSessionUsageService(repositories, config);

    await expect(
      service.consumeMutationQuota(repositories, "session-1")
    ).rejects.toBeInstanceOf(GuestSessionUsageUnavailableError);
  });

  it("maps reset quota repository failures to a usage unavailable error", async () => {
    const repositories = createRepositoryStub({
      resetError: new Error("database unavailable")
    });
    const service = new GuestSessionUsageService(repositories, config);

    await expect(
      service.consumeResetQuota(repositories, "session-1")
    ).rejects.toBeInstanceOf(GuestSessionUsageUnavailableError);
  });
});

function createRepositoryStub(options: {
  burstResult?: Awaited<ReturnType<PostgresRepositories["guestSessionUsage"]["consumeBurst"]>>;
  mutationResult?: Awaited<ReturnType<PostgresRepositories["guestSessionUsage"]["consumeMutationQuota"]>>;
  resetResult?: Awaited<ReturnType<PostgresRepositories["guestSessionUsage"]["consumeResetQuota"]>>;
  burstError?: Error;
  mutationError?: Error;
  resetError?: Error;
} = {}) {
  const repositories = {} as PostgresRepositories;
  const transaction: PostgresRepositories["transaction"] = async (operation) => operation(repositories);

  Object.assign(repositories, {
    guestSessions: {} as GuestSessionRepository,
    guestSessionUsage: {
      consumeBurst: vi.fn(async () => {
        if (options.burstError) {
          throw options.burstError;
        }

        return options.burstResult ?? { allowed: true };
      }),
      consumeMutationQuota: vi.fn(async () => {
        if (options.mutationError) {
          throw options.mutationError;
        }

        return options.mutationResult ?? { allowed: true };
      }),
      consumeResetQuota: vi.fn(async () => {
        if (options.resetError) {
          throw options.resetError;
        }

        return options.resetResult ?? { allowed: true };
      })
    },
    demoReset: {
      deleteEventsByGuestSession: vi.fn(),
      deleteShipmentsByGuestSession: vi.fn(),
      lockGuestSession: vi.fn()
    },
    shipments: {},
    shipmentEvents: {},
    transaction
  });

  return repositories;
}
