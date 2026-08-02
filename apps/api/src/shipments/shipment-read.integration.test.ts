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

    await Promise.all([
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

    expect(list.json().shipments).toHaveLength(3);
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
