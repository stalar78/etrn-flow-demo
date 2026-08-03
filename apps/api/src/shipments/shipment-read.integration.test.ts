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

  it("returns a controlled response for transition database failures", async () => {
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
    expect(response.json()).toEqual({ error: "transition_unavailable" });
  });

  it("allows only one of two concurrent transitions from the same expected state", async () => {
    const app = createTestApp();
    const bootstrap = await app.inject({ method: "POST", url: "/api/demo/bootstrap" });
    const cookie = bootstrap.cookies[0];
    const target = await findShipmentByReference(app, cookie, "DEMO-001");
    const before = await loadShipmentDetail(app, cookie, target.id);

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
    await app.close();

    const success = responses.find((response) => response.statusCode === 200);
    const conflict = responses.find((response) => response.statusCode === 409);

    expect(success?.json().transition).toMatchObject({
      shipmentId: target.id,
      previousState: "awaiting_loading",
      nextState: "loading"
    });
    expect(conflict?.json()).toEqual({ error: "transition_conflict" });
    expect(
      after.events.filter((event: { eventType: string }) => event.eventType === "markVehicleArrived")
    ).toHaveLength(1);
    expect(after.events).toHaveLength(before.events.length + 1);
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

  it("returns a controlled response for reset database failures", async () => {
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
    expect(response.json()).toEqual({ error: "demo_reset_unavailable" });
  });
});

function createTestApp(options: { database?: AppOptions["database"] } = {}) {
  return createApp({
    enableGuestSessions: true,
    database: options.database ?? connection,
    sessionConfig: {
      cookieName: "test_guest_session",
      ttlSeconds: 60 * 60,
      cookieSecure: false,
      cookieSameSite: "lax"
    }
  });
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

function guestSessionRecord() {
  const now = new Date("2026-08-02T10:00:00.000Z");

  return {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    lastSeenAt: now
  };
}
