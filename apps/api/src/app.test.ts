import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "@etrn-flow/shared";

import { createApp } from "./app.js";

describe("api health route", () => {
  it("returns the expected health payload", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toEqual({
      status: "ok",
      service: "etrn-flow-api"
    });
  });
});
