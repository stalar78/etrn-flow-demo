import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp, type AppOptions } from "../app.js";
import { createDatabaseConnection } from "../db/connection.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for shipment read integration tests.");
}

const connection = createDatabaseConnection(databaseUrl);

beforeAll(async () => {
  await migrate(connection.db, {
    migrationsFolder: "drizzle"
  });

  return async () => {
    await connection.close();
  };
});

beforeEach(async () => {
  await removeFailingUsageQuotaTrigger();
  await removeFailingShipmentInsertTrigger();
  await removeFailingShipmentDeleteTrigger();
  await removeFailingShipmentEventTrigger();
  await connection.db.execute(sql`truncate shipment_events, shipments, guest_sessions restart identity cascade`);
});

describe("shipment read API", () => {
  it("bootstraps exactly three shipments and is idempotent", async () => {
    const app = createTestApp();
    const first = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = first.cookies[0];
    const second = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(first.json()).toEqual({ demo: { created: true, shipmentCount: 3 } });
    expect(second.json()).toEqual({ demo: { created: false, shipmentCount: 3 } });
    expect(list.json().shipments).toHaveLength(3);
    expect(list.json().shipments.map((shipment: { reference: string }) => shipment.reference).sort()).toEqual([
      "DEMO-001",
      "DEMO-002",
      "DEMO-003"
    ]);
  });

  it("handles concurrent bootstrap without duplicate shipments", async () => {
    const app = createTestApp();
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/demo/bootstrap",
        cookies: { [cookie.name]: cookie.value }
      }),
      app.inject({
        method: "POST",
        url: "/api/demo/bootstrap",
        cookies: { [cookie.name]: cookie.value }
      })
    ]);

    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
    expect(responses.map((response) => response.json().demo.shipmentCount)).toEqual([3, 3]);
    expect(responses.map((response) => response.json().demo.created).sort()).toEqual([
      false,
      true
    ]);
    expect(list.json().shipments).toHaveLength(3);
    expect(new Set(list.json().shipments.map((shipment: { reference: string }) => shipment.reference)).size).toBe(3);
  });

  it("resets the current guest session to the deterministic initial dataset", async () => {
    const app = createTestApp();
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");

    await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });

    const reset = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [cookie.name]: cookie.value }
    });
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const resetDemo001 = list.json().shipments.find(
      (shipment: { reference: string }) => shipment.reference === "DEMO-001"
    );
    const detail = await loadShipmentDetail(app, cookie, resetDemo001.id);
    await app.close();

    expect(reset.statusCode).toBe(200);
    expect(reset.json()).toEqual({ reset: true });
    expect(list.json().shipments.map((shipment: { reference: string; state: string }) => ({
      reference: shipment.reference,
      state: shipment.state
    })).sort((left: { reference: string }, right: { reference: string }) =>
      left.reference.localeCompare(right.reference)
    )).toEqual([
      { reference: "DEMO-001", state: "awaiting_loading" },
      { reference: "DEMO-002", state: "in_transit" },
      { reference: "DEMO-003", state: "completed" }
    ]);
    expect(detail.shipment.state).toBe("awaiting_loading");
    expect(detail.events).toHaveLength(2);
    expect(detail.events.map((event: { eventType: string }) => event.eventType)).toEqual([
      "shipment_created",
      "dispatch"
    ]);
    expect(detail.events[0]?.previousState).toBe("draft");
    expect(detail.events.at(-1)?.nextState).toBe("awaiting_loading");
  });

  it("resets only the current guest session and leaves another session unchanged", async () => {
    const app = createTestApp();
    const firstBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const secondBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const firstCookie = firstBootstrap.cookies[0];
    const secondCookie = secondBootstrap.cookies[0];
    const secondTarget = await findShipmentByReference(app, secondCookie, "DEMO-001");

    await app.inject({
      method: "POST",
      url: `/api/shipments/${secondTarget.id}/actions`,
      cookies: { [secondCookie.name]: secondCookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });

    const reset = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [firstCookie.name]: firstCookie.value },
      payload: {
        guestSessionId: secondCookie.value,
        shipments: [{ reference: "DEMO-001", state: "cancelled" }]
      }
    });
    const firstDemo001 = await findShipmentByReference(app, firstCookie, "DEMO-001");
    const secondAfter = await loadShipmentDetail(app, secondCookie, secondTarget.id);
    await app.close();

    expect(reset.statusCode).toBe(200);
    expect(firstDemo001.state).toBe("awaiting_loading");
    expect(secondAfter.shipment.state).toBe("loading");
    expect(secondAfter.events.map((event: { eventType: string }) => event.eventType)).toContain("markVehicleArrived");
  });

  it("handles repeated and concurrent reset without duplicate shipments or event chains", async () => {
    const app = createTestApp();
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });

    const repeated = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [cookie.name]: cookie.value }
    });
    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/demo/reset",
        cookies: { [cookie.name]: cookie.value }
      }),
      app.inject({
        method: "POST",
        url: "/api/demo/reset",
        cookies: { [cookie.name]: cookie.value }
      })
    ]);

    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const demo001 = await findShipmentByReference(app, cookie, "DEMO-001");
    const detail = await loadShipmentDetail(app, cookie, demo001.id);
    await app.close();

    expect(repeated.statusCode).toBe(200);
    expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
    expect(list.json().shipments).toHaveLength(3);
    expect(new Set(list.json().shipments.map((shipment: { reference: string }) => shipment.reference)).size).toBe(3);
    expect(detail.events).toHaveLength(2);
  });

  it("enforces burst rate limits with Retry-After before business execution", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({
        rateMaxRequests: 2,
        rateWindowSeconds: 10
      })
    });
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    const first = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    const limited = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({ error: "guest_session_rate_limited" });
    expect(Number(limited.headers["retry-after"])).toBeGreaterThanOrEqual(1);
  });

  it("starts a fresh burst window after the configured interval expires", async () => {
    let currentTime = new Date("2026-08-02T10:00:00.000Z");
    const app = createTestApp({
      abuseControlConfig: abuseConfig({
        rateMaxRequests: 1,
        rateWindowSeconds: 5
      }),
      clock: {
        now: () => currentTime
      }
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];

    const limited = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    currentTime = new Date("2026-08-02T10:00:06.000Z");
    const afterWindow = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(bootstrap.statusCode).toBe(200);
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({ error: "guest_session_rate_limited" });
    expect(afterWindow.statusCode).toBe(200);
    expect(afterWindow.json()).toEqual({ demo: { created: false, shipmentCount: 3 } });
  });

  it("does not allow concurrent burst requests to exceed the configured window maximum", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({
        rateMaxRequests: 1,
        rateWindowSeconds: 10
      })
    });
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/demo/bootstrap",
        cookies: { [cookie.name]: cookie.value }
      }),
      app.inject({
        method: "POST",
        url: "/api/demo/bootstrap",
        cookies: { [cookie.name]: cookie.value }
      })
    ]);
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 429]);
    expect(responses.find((response) => response.statusCode === 429)?.json()).toEqual({
      error: "guest_session_rate_limited"
    });
    expect(list.json().shipments).toHaveLength(3);
  });

  it("keeps quota and burst windows isolated by guest session", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({
        mutationLimit: 1,
        rateMaxRequests: 1
      })
    });
    const first = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const second = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    await app.close();

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.cookies[0]?.value).not.toBe(second.cookies[0]?.value);
  });

  it("gives a replacement guest session an independent quota boundary", async () => {
    let currentTime = new Date("2026-08-02T10:00:00.000Z");
    const app = createTestApp({
      abuseControlConfig: abuseConfig({
        mutationLimit: 1,
        rateMaxRequests: 10
      }),
      clock: {
        now: () => currentTime
      },
      sessionConfig: {
        ttlSeconds: 1
      }
    });
    const first = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const expiredCookie = first.cookies[0];
    currentTime = new Date("2026-08-02T10:00:02.000Z");

    const replacement = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [expiredCookie.name]: expiredCookie.value }
    });
    await app.close();

    expect(first.statusCode).toBe(200);
    expect(replacement.statusCode).toBe(200);
    expect(replacement.cookies[0]?.value).not.toBe(expiredCookie.value);
    expect(replacement.json()).toEqual({ demo: { created: true, shipmentCount: 3 } });
  });

  it("allows read endpoints after mutation quota is exhausted", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 1, rateMaxRequests: 10 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");

    const blocked = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const detail = await app.inject({
      method: "GET",
      url: `/api/shipments/${target.id}`,
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: "guest_session_quota_exceeded" });
    expect(list.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
  });

  it("does not spend lifetime mutation quota for idempotent bootstrap, invalid, forbidden, or not-found transitions", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 2, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");

    const idempotent = await app.inject({
      method: "POST",
      url: "/api/demo/bootstrap",
      cookies: { [cookie.name]: cookie.value }
    });
    const forbidden = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "driver"
      }
    });
    const missing = await app.inject({
      method: "POST",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111/actions",
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const success = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    await app.close();

    expect(idempotent.json()).toEqual({ demo: { created: false, shipmentCount: 3 } });
    expect(forbidden.statusCode).toBe(403);
    expect(missing.statusCode).toBe(404);
    expect(success.statusCode).toBe(200);
  });

  it("rejects reset by reset quota without changing the dataset or resetting counters", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, resetLimit: 1, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];

    const firstReset = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [cookie.name]: cookie.value }
    });
    const currentDemo001 = await findShipmentByReference(app, cookie, "DEMO-001");
    await app.inject({
      method: "POST",
      url: `/api/shipments/${currentDemo001.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const beforeList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const beforeDetail = await loadShipmentDetail(app, cookie, currentDemo001.id);
    const beforeUsage = await loadUsage(cookie.value);

    const blockedReset = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [cookie.name]: cookie.value }
    });
    const afterList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const afterDemo001 = afterList.json().shipments.find(
      (shipment: { reference: string }) => shipment.reference === "DEMO-001"
    );
    const afterDetail = await loadShipmentDetail(app, cookie, afterDemo001.id);
    const afterUsage = await loadUsage(cookie.value);
    await app.close();

    expect(firstReset.statusCode).toBe(200);
    expect(beforeList.json().shipments).toHaveLength(3);
    expect(blockedReset.statusCode).toBe(429);
    expect(blockedReset.json()).toEqual({ error: "demo_reset_quota_exceeded" });
    expect(afterList.json().shipments).toHaveLength(3);
    expect(snapshotShipments(afterList.json().shipments)).toEqual(
      snapshotShipments(beforeList.json().shipments)
    );
    expect(afterDemo001).toMatchObject({
      id: currentDemo001.id,
      reference: "DEMO-001"
    });
    expect(afterDetail.shipment.state).toBe(beforeDetail.shipment.state);
    expect(afterDetail.events.map((event: { eventType: string }) => event.eventType)).toEqual(
      beforeDetail.events.map((event: { eventType: string }) => event.eventType)
    );
    expect(afterDetail.events.map((event: { previousState: string; nextState: string }) => ({
      previousState: event.previousState,
      nextState: event.nextState
    }))).toEqual(
      beforeDetail.events.map((event: { previousState: string; nextState: string }) => ({
        previousState: event.previousState,
        nextState: event.nextState
      }))
    );
    expect(afterDetail.shipment.state).toBe("loading");
    expect(afterDetail.events.map((event: { eventType: string }) => event.eventType)).toContain("markVehicleArrived");
    expect(afterUsage).toMatchObject({
      mutation_count: beforeUsage?.mutation_count,
      reset_count: beforeUsage?.reset_count,
      rate_window_count: (beforeUsage?.rate_window_count ?? 0) + 1
    });
  });

  it("rejects reset by general mutation quota without changing the dataset", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 1, resetLimit: 10, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");

    const blockedReset = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [cookie.name]: cookie.value }
    });
    const after = await loadShipmentDetail(app, cookie, target.id);
    await app.close();

    expect(blockedReset.statusCode).toBe(429);
    expect(blockedReset.json()).toEqual({ error: "guest_session_quota_exceeded" });
    expect(after.shipment.state).toBe("awaiting_loading");
    expect(after.events).toHaveLength(2);
  });

  it("rejects transition by general mutation quota without changing shipment state or appending an event", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 1, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");
    const before = await loadShipmentDetail(app, cookie, target.id);

    const blocked = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const after = await loadShipmentDetail(app, cookie, target.id);
    await app.close();

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({ error: "guest_session_quota_exceeded" });
    expect(after.shipment.state).toBe(before.shipment.state);
    expect(after.events).toHaveLength(before.events.length);
  });

  it("returns usage unavailable when bootstrap lifetime quota persistence fails and creates no dataset", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, rateMaxRequests: 20 })
    });
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    await installFailingUsageQuotaTrigger();
    let response;
    try {
      response = await app.inject({
        method: "POST",
        url: "/api/demo/bootstrap",
        cookies: { [cookie.name]: cookie.value }
      });
    } finally {
      await removeFailingUsageQuotaTrigger();
    }
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const usage = await loadUsage(cookie.value);
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "guest_session_usage_unavailable" });
    expect(list.json().shipments).toHaveLength(0);
    expect(usage).toMatchObject({
      mutation_count: 0,
      reset_count: 0,
      rate_window_count: 1
    });
  });

  it("returns usage unavailable when reset lifetime quota persistence fails and preserves the dataset", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, resetLimit: 10, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const beforeList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const beforeUsage = await loadUsage(cookie.value);

    await installFailingUsageQuotaTrigger();
    let response;
    try {
      response = await app.inject({
        method: "POST",
        url: "/api/demo/reset",
        cookies: { [cookie.name]: cookie.value }
      });
    } finally {
      await removeFailingUsageQuotaTrigger();
    }
    const afterList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const afterUsage = await loadUsage(cookie.value);
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "guest_session_usage_unavailable" });
    expect(afterList.json().shipments).toEqual(beforeList.json().shipments);
    expect(afterUsage).toMatchObject({
      mutation_count: beforeUsage?.mutation_count,
      reset_count: beforeUsage?.reset_count,
      rate_window_count: (beforeUsage?.rate_window_count ?? 0) + 1
    });
  });

  it("returns usage unavailable when transition lifetime quota persistence fails without changing state or events", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");
    const before = await loadShipmentDetail(app, cookie, target.id);
    const beforeUsage = await loadUsage(cookie.value);

    await installFailingUsageQuotaTrigger();
    let response;
    try {
      response = await app.inject({
        method: "POST",
        url: `/api/shipments/${target.id}/actions`,
        cookies: { [cookie.name]: cookie.value },
        payload: {
          action: "markVehicleArrived",
          actorRole: "warehouse"
        }
      });
    } finally {
      await removeFailingUsageQuotaTrigger();
    }
    const after = await loadShipmentDetail(app, cookie, target.id);
    const afterUsage = await loadUsage(cookie.value);
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "guest_session_usage_unavailable" });
    expect(after.shipment.state).toBe(before.shipment.state);
    expect(after.events).toHaveLength(before.events.length);
    expect(afterUsage).toMatchObject({
      mutation_count: beforeUsage?.mutation_count,
      reset_count: beforeUsage?.reset_count,
      rate_window_count: (beforeUsage?.rate_window_count ?? 0) + 1
    });
  });

  it("keeps the bootstrap-specific error for ordinary bootstrap persistence failures", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, rateMaxRequests: 20 })
    });
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    await installFailingShipmentInsertTrigger();
    let response;
    try {
      response = await app.inject({
        method: "POST",
        url: "/api/demo/bootstrap",
        cookies: { [cookie.name]: cookie.value }
      });
    } finally {
      await removeFailingShipmentInsertTrigger();
    }
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "demo_bootstrap_unavailable" });
    expect(list.json().shipments).toHaveLength(0);
  });

  it("keeps the reset-specific error for ordinary reset persistence failures", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, resetLimit: 10, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const beforeList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });

    await installFailingShipmentDeleteTrigger();
    let response;
    try {
      response = await app.inject({
        method: "POST",
        url: "/api/demo/reset",
        cookies: { [cookie.name]: cookie.value }
      });
    } finally {
      await removeFailingShipmentDeleteTrigger();
    }
    const afterList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "demo_reset_unavailable" });
    expect(afterList.json().shipments).toEqual(beforeList.json().shipments);
  });

  it("rolls back lifetime quota when transition persistence fails inside the business transaction", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 2, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");

    await installFailingShipmentEventTrigger();
    let failed;
    try {
      failed = await app.inject({
        method: "POST",
        url: `/api/shipments/${target.id}/actions`,
        cookies: { [cookie.name]: cookie.value },
        payload: {
          action: "markVehicleArrived",
          actorRole: "warehouse"
        }
      });
    } finally {
      await removeFailingShipmentEventTrigger();
    }

    const retry = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const after = await loadShipmentDetail(app, cookie, target.id);
    await app.close();

    expect(failed.statusCode).toBe(503);
    expect(failed.json()).toEqual({ error: "transition_unavailable" });
    expect(retry.statusCode).toBe(200);
    expect(after.shipment.state).toBe("loading");
  });

  it("allows only one concurrent transition to consume the final mutation quota slot", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 2, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const demo001 = await findShipmentByReference(app, cookie, "DEMO-001");
    const seededShipmentId = "22222222-2222-4222-8222-222222222222";
    await connection.db.execute(sql`
      insert into shipments (id, guest_session_id, reference, state)
      values (${seededShipmentId}, ${cookie.value}, 'TEST-FINAL-SLOT', 'awaiting_loading')
    `);

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/shipments/${demo001.id}/actions`,
        cookies: { [cookie.name]: cookie.value },
        payload: {
          action: "markVehicleArrived",
          actorRole: "warehouse"
        }
      }),
      app.inject({
        method: "POST",
        url: `/api/shipments/${seededShipmentId}/actions`,
        cookies: { [cookie.name]: cookie.value },
        payload: {
          action: "markVehicleArrived",
          actorRole: "warehouse"
        }
      })
    ]);
    const demoAfter = await loadShipmentDetail(app, cookie, demo001.id);
    const seededAfter = await loadShipmentDetail(app, cookie, seededShipmentId);
    await app.close();

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 429]);
    expect(responses.find((response) => response.statusCode === 429)?.json()).toEqual({
      error: "guest_session_quota_exceeded"
    });
    expect([demoAfter.shipment.state, seededAfter.shipment.state].sort()).toEqual([
      "awaiting_loading",
      "loading"
    ]);
  });

  it("allows only one concurrent reset to consume the final reset quota slot", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, resetLimit: 2, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const firstReset = await app.inject({
      method: "POST",
      url: "/api/demo/reset",
      cookies: { [cookie.name]: cookie.value }
    });

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/demo/reset",
        cookies: { [cookie.name]: cookie.value }
      }),
      app.inject({
        method: "POST",
        url: "/api/demo/reset",
        cookies: { [cookie.name]: cookie.value }
      })
    ]);
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(firstReset.statusCode).toBe(200);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 429]);
    expect(responses.find((response) => response.statusCode === 429)?.json()).toEqual({
      error: "demo_reset_quota_exceeded"
    });
    expect(list.json().shipments).toHaveLength(3);
    expect(new Set(list.json().shipments.map((shipment: { reference: string }) => shipment.reference)).size).toBe(3);
  });

  it("isolates bootstrapped datasets by guest session", async () => {
    const app = createTestApp();
    const firstBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const secondBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const firstCookie = firstBootstrap.cookies[0];
    const secondCookie = secondBootstrap.cookies[0];

    const firstList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [firstCookie.name]: firstCookie.value }
    });
    const secondList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [secondCookie.name]: secondCookie.value }
    });
    await app.close();

    expect(firstList.json().shipments).toHaveLength(3);
    expect(secondList.json().shipments).toHaveLength(3);
    expect(firstList.json().shipments[0].id).not.toBe(secondList.json().shipments[0].id);
  });

  it("returns shipment detail with events ordered by sequence", async () => {
    const app = createTestApp();
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const list = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [cookie.name]: cookie.value }
    });
    const shipmentId = list.json().shipments[0].id;

    const detail = await app.inject({
      method: "GET",
      url: `/api/shipments/${shipmentId}`,
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(detail.statusCode).toBe(200);
    expect(detail.json().shipment.id).toBe(shipmentId);
    expect(detail.json().events.length).toBeGreaterThan(0);
    expect(detail.json().events.map((event: { sequence: number }) => event.sequence)).toEqual(
      [...detail.json().events.map((event: { sequence: number }) => event.sequence)].sort(
        (left, right) => left - right
      )
    );
  });

  it("executes a valid workflow transition and appends one ordered event", async () => {
    const app = createTestApp();
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");
    const before = await loadShipmentDetail(app, cookie, target.id);

    const response = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const after = await loadShipmentDetail(app, cookie, target.id);
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().transition).toEqual({
      shipmentId: target.id,
      action: "markVehicleArrived",
      actorRole: "warehouse",
      previousState: "awaiting_loading",
      nextState: "loading"
    });
    expect(after.shipment.state).toBe("loading");
    expect(after.events).toHaveLength(before.events.length + 1);
    expect(after.events.at(-1)).toMatchObject({
      eventType: "markVehicleArrived",
      actorRole: "warehouse",
      previousState: "awaiting_loading",
      nextState: "loading"
    });
    expect(after.events.map((event: { sequence: number }) => event.sequence)).toEqual(
      [...after.events.map((event: { sequence: number }) => event.sequence)].sort(
        (left, right) => left - right
      )
    );
  });

  it("rejects repeated and forbidden workflow transitions", async () => {
    const app = createTestApp();
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");

    const wrongRole = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "driver"
      }
    });
    const first = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const repeated = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    await app.close();

    expect(wrongRole.statusCode).toBe(403);
    expect(wrongRole.json()).toEqual({ error: "transition_forbidden" });
    expect(first.statusCode).toBe(200);
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json()).toEqual({ error: "invalid_transition" });
  });

  it("returns controlled errors for invalid transition requests and missing shipments", async () => {
    const app = createTestApp();
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const malformedId = await app.inject({
      method: "POST",
      url: "/api/shipments/not-a-uuid/actions",
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const malformedBody = await app.inject({
      method: "POST",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111/actions",
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "notAnAction",
        actorRole: "warehouse"
      }
    });
    const unknown = await app.inject({
      method: "POST",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111/actions",
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    await app.close();

    expect(malformedId.statusCode).toBe(400);
    expect(malformedId.json()).toEqual({ error: "invalid_shipment_id" });
    expect(malformedBody.statusCode).toBe(400);
    expect(malformedBody.json()).toEqual({ error: "invalid_transition_request" });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toEqual({ error: "shipment_not_found" });
  });

  it("does not allow one session to transition another session shipment", async () => {
    const app = createTestApp();
    const firstBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const secondSession = await app.inject({ method: "GET", url: "/api/session" });
    const firstCookie = firstBootstrap.cookies[0];
    const secondCookie = secondSession.cookies[0];
    const foreignShipment = await findShipmentByReference(app, firstCookie, "DEMO-001");

    const foreign = await app.inject({
      method: "POST",
      url: `/api/shipments/${foreignShipment.id}/actions`,
      cookies: { [secondCookie.name]: secondCookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    const unknown = await app.inject({
      method: "POST",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111/actions",
      cookies: { [secondCookie.name]: secondCookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    await app.close();

    expect(foreign.statusCode).toBe(404);
    expect(unknown.statusCode).toBe(404);
    expect(foreign.json()).toEqual(unknown.json());
  });

  it("returns a controlled response when usage persistence fails before transition business logic", async () => {
    const app = createTestApp({
      database: {
        db: {
          insert() {
            return {
              values() {
                return {
                  returning: async () => [guestSessionRecord()]
                };
              }
            };
          },
          select() {
            throw new Error("simulated database failure");
          },
          update() {
            throw new Error("simulated database failure");
          },
          transaction() {
            throw new Error("simulated database failure");
          }
        } as never,
        async close() {}
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111/actions",
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "guest_session_usage_unavailable" });
  });

  it("allows only one of two concurrent transitions from the same expected state", async () => {
    const app = createTestApp({
      abuseControlConfig: abuseConfig({ mutationLimit: 10, rateMaxRequests: 20 })
    });
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const otherBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const otherCookie = otherBootstrap.cookies[0];
    const otherListBefore = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [otherCookie.name]: otherCookie.value }
    });
    const otherTarget = await findShipmentByReference(app, otherCookie, "DEMO-001");
    const otherDetailBefore = await loadShipmentDetail(app, otherCookie, otherTarget.id);
    const otherUsageBefore = await loadUsage(otherCookie.value);
    const target = await findShipmentByReference(app, cookie, "DEMO-001");
    const before = await loadShipmentDetail(app, cookie, target.id);
    const usageBefore = await loadUsage(cookie.value);

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/shipments/${target.id}/actions`,
        cookies: { [cookie.name]: cookie.value },
        payload: {
          action: "markVehicleArrived",
          actorRole: "warehouse"
        }
      }),
      app.inject({
        method: "POST",
        url: `/api/shipments/${target.id}/actions`,
        cookies: { [cookie.name]: cookie.value },
        payload: {
          action: "markVehicleArrived",
          actorRole: "warehouse"
        }
      })
    ]);

    const after = await loadShipmentDetail(app, cookie, target.id);
    const usageAfterRace = await loadUsage(cookie.value);
    const otherListAfter = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [otherCookie.name]: otherCookie.value }
    });
    const otherDetailAfter = await loadShipmentDetail(app, otherCookie, otherTarget.id);
    const otherUsageAfter = await loadUsage(otherCookie.value);
    const repeated = await app.inject({
      method: "POST",
      url: `/api/shipments/${target.id}/actions`,
      cookies: { [cookie.name]: cookie.value },
      payload: {
        action: "markVehicleArrived",
        actorRole: "warehouse"
      }
    });
    await app.close();

    const successes = responses.filter((response) => response.statusCode === 200);
    const controlledLosers = responses.filter((response) => response.statusCode === 409);

    expect(successes).toHaveLength(1);
    expect(controlledLosers).toHaveLength(1);
    expect(successes[0]?.json().transition).toMatchObject({
      shipmentId: target.id,
      previousState: "awaiting_loading",
      nextState: "loading"
    });
    expect(["transition_conflict", "invalid_transition"]).toContain(
      controlledLosers[0]?.json().error
    );
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    expect(
      after.events.filter((event: { eventType: string }) => event.eventType === "markVehicleArrived")
    ).toHaveLength(1);
    expect(after.events).toHaveLength(before.events.length + 1);
    expect(after.shipment.state).toBe("loading");
    expect(snapshotEventChain(after.events.slice(0, before.events.length))).toEqual(
      snapshotEventChain(before.events)
    );
    expect(after.events.at(-1)).toMatchObject({
      eventType: "markVehicleArrived",
      previousState: "awaiting_loading",
      nextState: "loading"
    });
    const sequences = after.events.map((event: { sequence: number }) => event.sequence);
    expect(sequences).toEqual([...sequences].sort((left, right) => left - right));
    expect(
      sequences.every((sequence, index) => index === 0 || sequence > sequences[index - 1])
    ).toBe(true);
    expect(new Set(sequences).size).toBe(sequences.length);
    expect(after.events.at(-1)?.sequence).toBeGreaterThan(before.events.at(-1)?.sequence ?? -1);
    expect(hasContinuousStateChain(after.events)).toBe(true);
    expect(usageAfterRace).toMatchObject({
      mutation_count: (usageBefore?.mutation_count ?? 0) + 1,
      reset_count: usageBefore?.reset_count,
      rate_window_count: (usageBefore?.rate_window_count ?? 0) + 2
    });
    expect(repeated.statusCode).toBe(409);
    expect(repeated.json()).toEqual({ error: "invalid_transition" });
    expect(snapshotShipments(otherListAfter.json().shipments)).toEqual(
      snapshotShipments(otherListBefore.json().shipments)
    );
    expect(otherDetailAfter.shipment.state).toBe(otherDetailBefore.shipment.state);
    expect(snapshotEventChain(otherDetailAfter.events)).toEqual(
      snapshotEventChain(otherDetailBefore.events)
    );
    expect(hasContinuousStateChain(otherDetailAfter.events)).toBe(true);
    expect(otherUsageAfter).toMatchObject({
      mutation_count: otherUsageBefore?.mutation_count,
      reset_count: otherUsageBefore?.reset_count,
      rate_window_count: otherUsageBefore?.rate_window_count
    });
  });

  it("does not allow one session to open another session shipment", async () => {
    const app = createTestApp();
    const firstBootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const secondSession = await app.inject({ method: "GET", url: "/api/session" });
    const firstCookie = firstBootstrap.cookies[0];
    const secondCookie = secondSession.cookies[0];
    const firstList = await app.inject({
      method: "GET",
      url: "/api/shipments",
      cookies: { [firstCookie.name]: firstCookie.value }
    });
    const foreignShipmentId = firstList.json().shipments[0].id;

    const response = await app.inject({
      method: "GET",
      url: `/api/shipments/${foreignShipmentId}`,
      cookies: { [secondCookie.name]: secondCookie.value }
    });
    await app.close();

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "shipment_not_found" });
  });

  it("returns controlled errors for malformed and unknown shipment ids", async () => {
    const app = createTestApp();
    const session = await app.inject({ method: "GET", url: "/api/session" });
    const cookie = session.cookies[0];

    const malformed = await app.inject({
      method: "GET",
      url: "/api/shipments/not-a-uuid",
      cookies: { [cookie.name]: cookie.value }
    });
    const unknown = await app.inject({
      method: "GET",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111",
      cookies: { [cookie.name]: cookie.value }
    });
    await app.close();

    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ error: "invalid_shipment_id" });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toEqual({ error: "shipment_not_found" });
  });

  it("/health still does not create a guest session", async () => {
    const app = createTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.cookies).toHaveLength(0);
  });

  it("returns controlled responses for shipment database failures", async () => {
    const app = createTestApp({
      database: {
        db: {
          insert() {
            throw new Error("simulated database failure");
          },
          select() {
            throw new Error("simulated database failure");
          },
          update() {
            throw new Error("simulated database failure");
          },
          transaction() {
            throw new Error("simulated database failure");
          }
        } as never,
        async close() {}
      }
    });

    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const list = await app.inject({ method: "GET", url: "/api/shipments" });
    const detail = await app.inject({
      method: "GET",
      url: "/api/shipments/11111111-1111-4111-8111-111111111111"
    });
    await app.close();

    expect(bootstrap.statusCode).toBe(503);
    expect(list.statusCode).toBe(503);
    expect(detail.statusCode).toBe(503);
  });

  it("returns a controlled response when usage persistence fails before reset business logic", async () => {
    const app = createTestApp({
      database: {
        db: {
          delete() {
            throw new Error("simulated database failure");
          },
          execute() {
            throw new Error("simulated database failure");
          },
          insert() {
            return {
              values() {
                return {
                  returning: async () => [guestSessionRecord()]
                };
              }
            };
          },
          select() {
            throw new Error("simulated database failure");
          },
          update() {
            throw new Error("simulated database failure");
          },
          transaction() {
            throw new Error("simulated database failure");
          }
        } as never,
        async close() {}
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/demo/reset"
    });
    await app.close();

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "guest_session_usage_unavailable" });
  });
});

function createTestApp(options: {
  abuseControlConfig?: AppOptions["abuseControlConfig"];
  database?: AppOptions["database"];
  clock?: AppOptions["clock"];
  sessionConfig?: Partial<NonNullable<AppOptions["sessionConfig"]>>;
} = {}) {
  return createApp({
    abuseControlConfig: options.abuseControlConfig,
    clock: options.clock,
    enableGuestSessions: true,
    database: options.database ?? connection,
    sessionConfig: {
      cookieName: "test_guest_session",
      ttlSeconds: 60 * 60,
      cookieSecure: false,
      cookieSameSite: "lax",
      ...options.sessionConfig
    }
  });
}

function abuseConfig(overrides: Partial<NonNullable<AppOptions["abuseControlConfig"]>> = {}) {
  return {
    mutationLimit: 60,
    rateMaxRequests: 6,
    rateWindowSeconds: 10,
    resetLimit: 8,
    ...overrides
  };
}

async function findShipmentByReference(
  app: ReturnType<typeof createTestApp>,
  cookie: { name: string; value: string },
  reference: string
) {
  const response = await app.inject({
    method: "GET",
    url: "/api/shipments",
    cookies: { [cookie.name]: cookie.value }
  });

  const shipment = response.json().shipments.find(
    (item: { reference: string }) => item.reference === reference
  );

  if (!shipment) {
    throw new Error(`Shipment ${reference} was not found in test dataset.`);
  }

  return shipment as { id: string; reference: string; state: string };
}

async function loadShipmentDetail(
  app: ReturnType<typeof createTestApp>,
  cookie: { name: string; value: string },
  shipmentId: string
) {
  const response = await app.inject({
    method: "GET",
    url: `/api/shipments/${shipmentId}`,
    cookies: { [cookie.name]: cookie.value }
  });

  return response.json() as {
    shipment: { id: string; state: string };
    events: Array<{
      eventType: string;
      nextState: string;
      previousState: string;
      sequence: number;
    }>;
  };
}

function snapshotShipments(
  shipments: Array<{ id: string; reference: string; state: string }>
) {
  return shipments
    .map((shipment) => ({
      id: shipment.id,
      reference: shipment.reference,
      state: shipment.state
    }))
    .sort((left, right) => left.reference.localeCompare(right.reference));
}

function snapshotEventChain(
  events: Array<{
    eventType: string;
    nextState: string;
    previousState: string;
  }>
) {
  return events.map((event) => ({
    eventType: event.eventType,
    previousState: event.previousState,
    nextState: event.nextState
  }));
}

function hasContinuousStateChain(
  events: Array<{
    nextState: string;
    previousState: string;
  }>
) {
  return events.every((event, index) =>
    index === 0 || events[index - 1]?.nextState === event.previousState
  );
}

async function loadUsage(guestSessionId: string) {
  const records = await connection.db.execute<{
    mutation_count: number;
    reset_count: number;
    rate_window_count: number;
  }>(sql`
    select mutation_count, reset_count, rate_window_count
    from guest_session_usage_limits
    where guest_session_id = ${guestSessionId}
    limit 1
  `);

  return records.rows[0] ?? null;
}

function guestSessionRecord() {
  const now = new Date("2026-08-02T10:00:00.000Z");

  return {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    lastSeenAt: now
  };
}

async function installFailingUsageQuotaTrigger() {
  await connection.db.execute(sql`
    create or replace function fail_usage_quota_update_for_test()
    returns trigger
    language plpgsql
    as $$
    begin
      if new.mutation_count <> old.mutation_count
        or new.reset_count <> old.reset_count then
        raise exception 'simulated usage quota persistence failure';
      end if;

      return new;
    end;
    $$
  `);
  await connection.db.execute(sql`
    create trigger fail_usage_quota_update_for_test
    before update on guest_session_usage_limits
    for each row
    execute function fail_usage_quota_update_for_test()
  `);
}

async function removeFailingUsageQuotaTrigger() {
  await connection.db.execute(sql`
    drop trigger if exists fail_usage_quota_update_for_test on guest_session_usage_limits
  `);
  await connection.db.execute(sql`
    drop function if exists fail_usage_quota_update_for_test()
  `);
}

async function installFailingShipmentInsertTrigger() {
  await connection.db.execute(sql`
    create or replace function fail_shipment_insert_for_test()
    returns trigger
    language plpgsql
    as $$
    begin
      raise exception 'simulated shipment insert failure';
    end;
    $$
  `);
  await connection.db.execute(sql`
    create trigger fail_shipment_insert_for_test
    before insert on shipments
    for each row
    execute function fail_shipment_insert_for_test()
  `);
}

async function removeFailingShipmentInsertTrigger() {
  await connection.db.execute(sql`
    drop trigger if exists fail_shipment_insert_for_test on shipments
  `);
  await connection.db.execute(sql`
    drop function if exists fail_shipment_insert_for_test()
  `);
}

async function installFailingShipmentDeleteTrigger() {
  await connection.db.execute(sql`
    create or replace function fail_shipment_delete_for_test()
    returns trigger
    language plpgsql
    as $$
    begin
      raise exception 'simulated shipment delete failure';
    end;
    $$
  `);
  await connection.db.execute(sql`
    create trigger fail_shipment_delete_for_test
    before delete on shipments
    for each row
    execute function fail_shipment_delete_for_test()
  `);
}

async function removeFailingShipmentDeleteTrigger() {
  await connection.db.execute(sql`
    drop trigger if exists fail_shipment_delete_for_test on shipments
  `);
  await connection.db.execute(sql`
    drop function if exists fail_shipment_delete_for_test()
  `);
}

async function installFailingShipmentEventTrigger() {
  await connection.db.execute(sql`
    create or replace function fail_shipment_event_append_for_test()
    returns trigger
    language plpgsql
    as $$
    begin
      raise exception 'simulated shipment event append failure';
    end;
    $$
  `);
  await connection.db.execute(sql`
    create trigger fail_shipment_event_append_for_test
    before insert on shipment_events
    for each row
    execute function fail_shipment_event_append_for_test()
  `);
}

async function removeFailingShipmentEventTrigger() {
  await connection.db.execute(sql`
    drop trigger if exists fail_shipment_event_append_for_test on shipment_events
  `);
  await connection.db.execute(sql`
    drop function if exists fail_shipment_event_append_for_test()
  `);
}
