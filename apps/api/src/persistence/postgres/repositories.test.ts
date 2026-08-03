import { describe, expect, it, vi } from "vitest";

import { createPostgresRepositories } from "./repositories.js";

describe("PostgresGuestSessionUsageRepository", () => {
  it("does not allow burst consumption when SQL returns no decision row", async () => {
    const db = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
    };
    const repositories = createPostgresRepositories(db as never);

    await expect(
      repositories.guestSessionUsage.consumeBurst({
        guestSessionId: "11111111-1111-4111-8111-111111111111",
        limit: 1,
        now: new Date("2026-08-03T10:00:00.000Z"),
        windowSeconds: 10
      })
    ).rejects.toThrow("Guest session burst consumption did not return a result.");
  });
});
