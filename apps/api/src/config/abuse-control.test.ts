import { describe, expect, it } from "vitest";

import { getAbuseControlConfig } from "./abuse-control.js";

describe("abuse control config", () => {
  it("uses safe defaults", () => {
    expect(getAbuseControlConfig({})).toEqual({
      mutationLimit: 60,
      resetLimit: 8,
      rateWindowSeconds: 10,
      rateMaxRequests: 8
    });
  });

  it("coerces valid integer environment overrides", () => {
    expect(getAbuseControlConfig({
      GUEST_SESSION_MUTATION_LIMIT: "5",
      GUEST_SESSION_RESET_LIMIT: "2",
      GUEST_SESSION_RATE_WINDOW_SECONDS: "3",
      GUEST_SESSION_RATE_MAX_REQUESTS: "4"
    })).toEqual({
      mutationLimit: 5,
      resetLimit: 2,
      rateWindowSeconds: 3,
      rateMaxRequests: 4
    });
  });

  it("rejects zero, negative, NaN, and excessive values", () => {
    expect(() => getAbuseControlConfig({ GUEST_SESSION_MUTATION_LIMIT: "0" })).toThrow();
    expect(() => getAbuseControlConfig({ GUEST_SESSION_RESET_LIMIT: "-1" })).toThrow();
    expect(() => getAbuseControlConfig({ GUEST_SESSION_RATE_WINDOW_SECONDS: "NaN" })).toThrow();
    expect(() => getAbuseControlConfig({ GUEST_SESSION_RATE_MAX_REQUESTS: "10001" })).toThrow();
    expect(() => getAbuseControlConfig({ GUEST_SESSION_RATE_WINDOW_SECONDS: "86401" })).toThrow();
    expect(() => getAbuseControlConfig({ GUEST_SESSION_MUTATION_LIMIT: "100001" })).toThrow();
  });
});
