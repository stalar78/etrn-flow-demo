import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, describe, expect, it } from "vitest";

import { createDatabaseConnection } from "../../db/connection.js";
import { createPostgresRepositories } from "./repositories.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for persistence integration tests.");
}

const connection = createDatabaseConnection(databaseUrl);
const repositories = createPostgresRepositories(connection.db);

beforeAll(async () => {
  await migrate(connection.db, {
    migrationsFolder: "drizzle"
  });
  await connection.db.execute(sql`truncate shipment_events, shipments, guest_sessions restart identity cascade`);

  return async () => {
    await connection.close();
  };
});

describe("PostgreSQL persistence repositories", () => {
  it("creates and loads guest sessions", async () => {
    const session = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });

    const loaded = await repositories.guestSessions.findById(session.id);

    expect(loaded).toMatchObject({
      id: session.id,
      expiresAt: session.expiresAt
    });
  });

  it("scopes shipments by guest session and enforces per-session references", async () => {
    const firstSession = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });
    const secondSession = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });

    const shipment = await repositories.shipments.create({
      guestSessionId: firstSession.id,
      reference: "ETRN-001",
      state: "draft"
    });

    await expect(
      repositories.shipments.create({
        guestSessionId: firstSession.id,
        reference: "ETRN-001",
        state: "draft"
      })
    ).rejects.toThrow();

    const sameReferenceOtherSession = await repositories.shipments.create({
      guestSessionId: secondSession.id,
      reference: "ETRN-001",
      state: "draft"
    });

    await expect(
      repositories.shipments.findByIdScoped({
        guestSessionId: firstSession.id,
        shipmentId: shipment.id
      })
    ).resolves.toMatchObject({
      id: shipment.id,
      reference: "ETRN-001"
    });

    await expect(
      repositories.shipments.findByIdScoped({
        guestSessionId: secondSession.id,
        shipmentId: shipment.id
      })
    ).resolves.toBeNull();

    await expect(
      repositories.shipments.listByGuestSession(secondSession.id)
    ).resolves.toEqual([expect.objectContaining({ id: sameReferenceOtherSession.id })]);
  });

  it("appends shipment events and lists them in order within one guest session", async () => {
    const firstSession = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });
    const secondSession = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });
    const shipment = await repositories.shipments.create({
      guestSessionId: firstSession.id,
      reference: "ETRN-002",
      state: "draft"
    });

    await repositories.shipmentEvents.append({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id,
      eventType: "shipment_created",
      actorRole: "dispatcher",
      previousState: "draft",
      nextState: "draft"
    });
    await repositories.shipmentEvents.append({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id,
      eventType: "prepare_dispatch",
      actorRole: "dispatcher",
      previousState: "draft",
      nextState: "ready_for_dispatch",
      payload: { source: "integration-test" }
    });

    const events = await repositories.shipmentEvents.listForShipmentScoped({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id
    });

    expect(events.map((event) => event.eventType)).toEqual([
      "shipment_created",
      "prepare_dispatch"
    ]);
    expect(events[1]?.payload).toEqual({ source: "integration-test" });

    await expect(
      repositories.shipmentEvents.listForShipmentScoped({
        guestSessionId: secondSession.id,
        shipmentId: shipment.id
      })
    ).resolves.toEqual([]);

    await expect(
      repositories.shipmentEvents.append({
        guestSessionId: secondSession.id,
        shipmentId: shipment.id,
        eventType: "cross_session_attempt",
        actorRole: "dispatcher",
        previousState: "draft",
        nextState: "draft"
      })
    ).rejects.toThrow();
  });

  it("updates shipment state only when the expected state matches", async () => {
    const session = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });
    const shipment = await repositories.shipments.create({
      guestSessionId: session.id,
      reference: "ETRN-003",
      state: "draft"
    });

    const updated = await repositories.shipments.updateStateGuarded({
      guestSessionId: session.id,
      shipmentId: shipment.id,
      expectedState: "draft",
      nextState: "ready_for_dispatch"
    });

    expect(updated).toMatchObject({
      id: shipment.id,
      state: "ready_for_dispatch"
    });

    const staleUpdate = await repositories.shipments.updateStateGuarded({
      guestSessionId: session.id,
      shipmentId: shipment.id,
      expectedState: "draft",
      nextState: "awaiting_loading"
    });

    expect(staleUpdate).toBeNull();
  });

  it("creates shipment and initial event inside one transaction", async () => {
    const session = await repositories.guestSessions.create({
      expiresAt: tomorrow()
    });

    const result = await repositories.transaction(async (transactionalRepositories) => {
      const shipment = await transactionalRepositories.shipments.create({
        guestSessionId: session.id,
        reference: "ETRN-004",
        state: "draft"
      });
      const event = await transactionalRepositories.shipmentEvents.append({
        guestSessionId: session.id,
        shipmentId: shipment.id,
        eventType: "shipment_created",
        actorRole: "dispatcher",
        previousState: "draft",
        nextState: "draft"
      });

      return { shipment, event };
    });

    expect(result.event.shipmentId).toBe(result.shipment.id);
  });
});

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}
