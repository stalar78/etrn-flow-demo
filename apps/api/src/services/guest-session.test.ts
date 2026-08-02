import { describe, expect, it, vi } from "vitest";

import type {
  CreateGuestSessionInput,
  GuestSessionRecord,
  GuestSessionRepository
} from "@etrn-flow/domain";

import { GuestSessionService, type Clock } from "./guest-session.js";

describe("GuestSessionService", () => {
  it("creates a session when id is missing", async () => {
    const { service, repository } = setup();

    const result = await service.resolveOrCreate();

    expect(result.created).toBe(true);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("reuses a valid unexpired session", async () => {
    const now = new Date("2026-08-02T10:00:00.000Z");
    const { service, repository } = setup({
      now,
      existing: sessionRecord({
        id: "existing-session",
        expiresAt: new Date(now.getTime() + 1000)
      })
    });

    const result = await service.resolveOrCreate("existing-session");

    expect(result).toMatchObject({
      created: false,
      session: { id: "existing-session" }
    });
    expect(repository.touchLastSeen).toHaveBeenCalledWith({
      id: "existing-session",
      lastSeenAt: now
    });
  });

  it("creates a replacement when id is unknown", async () => {
    const { service } = setup({ existing: null });

    const result = await service.resolveOrCreate("unknown-session");

    expect(result).toMatchObject({
      created: true,
      replacedSessionId: "unknown-session"
    });
  });

  it("creates a replacement when session is expired", async () => {
    const now = new Date("2026-08-02T10:00:00.000Z");
    const { service } = setup({
      now,
      existing: sessionRecord({
        id: "expired-session",
        expiresAt: new Date(now.getTime() - 1)
      })
    });

    const result = await service.resolveOrCreate("expired-session");

    expect(result).toMatchObject({
      created: true,
      replacedSessionId: "expired-session"
    });
  });

  it("calculates TTL from the injected clock", async () => {
    const now = new Date("2026-08-02T10:00:00.000Z");
    const { service, repository } = setup({ now, ttlSeconds: 60 });

    await service.resolveOrCreate();

    expect(repository.create).toHaveBeenCalledWith({
      expiresAt: new Date("2026-08-02T10:01:00.000Z")
    });
  });

  it("propagates repository failures", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.create).mockRejectedValueOnce(new Error("database unavailable"));

    await expect(service.resolveOrCreate()).rejects.toThrow("database unavailable");
  });
});

function setup(options: {
  existing?: GuestSessionRecord | null;
  now?: Date;
  ttlSeconds?: number;
} = {}) {
  const now = options.now ?? new Date("2026-08-02T10:00:00.000Z");
  const clock: Clock = { now: () => now };
  const createdSession = sessionRecord({
    id: "created-session",
    createdAt: now,
    expiresAt: new Date(now.getTime() + (options.ttlSeconds ?? 300) * 1000),
    lastSeenAt: now
  });
  const existing = options.existing;
  const repository: GuestSessionRepository = {
    create: vi.fn(async (input: CreateGuestSessionInput) =>
      sessionRecord({
        ...createdSession,
        expiresAt: input.expiresAt
      })
    ),
    findById: vi.fn(async () => existing ?? null),
    touchLastSeen: vi.fn(async ({ id, lastSeenAt }) =>
      existing ? { ...existing, id, lastSeenAt } : null
    )
  };

  return {
    now,
    repository,
    service: new GuestSessionService(repository, {
      ttlSeconds: options.ttlSeconds ?? 300
    }, clock)
  };
}

function sessionRecord(overrides: Partial<GuestSessionRecord> = {}): GuestSessionRecord {
  const now = new Date("2026-08-02T10:00:00.000Z");

  return {
    id: "session-id",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 300_000),
    lastSeenAt: now,
    ...overrides
  };
}
