import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabaseConnection } from "../../db/connection.js";
import { GuestSessionCleanupService } from "../../services/guest-session-cleanup.js";
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

  return async () => {
    await connection.close();
  };
});

beforeEach(async () => {
  await deleteCleanupTestSessions();
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

  it("appends shipment events and lists them in deterministic append order", async () => {
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

    const firstEvent = await repositories.shipmentEvents.append({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id,
      eventType: "shipment_created",
      actorRole: "dispatcher",
      previousState: "draft",
      nextState: "draft"
    });
    const secondEvent = await repositories.shipmentEvents.append({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id,
      eventType: "prepare_dispatch",
      actorRole: "dispatcher",
      previousState: "draft",
      nextState: "ready_for_dispatch",
      payload: { source: "integration-test" }
    });
    const thirdEvent = await repositories.shipmentEvents.append({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id,
      eventType: "dispatch",
      actorRole: "dispatcher",
      previousState: "ready_for_dispatch",
      nextState: "awaiting_loading"
    });

    const events = await repositories.shipmentEvents.listForShipmentScoped({
      guestSessionId: firstSession.id,
      shipmentId: shipment.id
    });

    expect(events.map((event) => event.eventType)).toEqual([
      "shipment_created",
      "prepare_dispatch",
      "dispatch"
    ]);
    expect(events.map((event) => event.sequence)).toEqual([
      firstEvent.sequence,
      secondEvent.sequence,
      thirdEvent.sequence
    ]);
    expect(firstEvent.sequence).toBeLessThan(secondEvent.sequence);
    expect(secondEvent.sequence).toBeLessThan(thirdEvent.sequence);
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

describe("PostgreSQL expired guest-session cleanup", () => {
  it("preserves active sessions and their child rows", async () => {
    await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      const activeSessionId = await createSessionWithChildren("active", tx);
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 10,
        maxBatches: 10
      });

      const result = await service.cleanupExpiredGuestSessions();

      expect(result.deletedSessionCount).toBe(0);
      await expectGuestSessionWithChildren(activeSessionId, true, tx);
    });
  });

  it("preserves recently expired sessions and their child rows", async () => {
    await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      const recentSessionId = await createSessionWithChildren("recently-expired", tx);
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 10,
        maxBatches: 10
      });

      const result = await service.cleanupExpiredGuestSessions();

      expect(result.deletedSessionCount).toBe(0);
      await expectGuestSessionWithChildren(recentSessionId, true, tx);
    });
  });

  it("deletes eligible expired sessions and relies on cascade for child rows", async () => {
    await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      const expiredSessionId = await createSessionWithChildren("eligible-expired", tx);
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 10,
        maxBatches: 10
      });

      const result = await service.cleanupExpiredGuestSessions();

      expect(result).toEqual({
        deletedSessionCount: 1,
        completedBatchCount: 1,
        safetyLimitReached: false
      });
      await expectGuestSessionWithChildren(expiredSessionId, false, tx);
    });
  });

  it("deletes only eligible sessions from a mixed dataset", async () => {
    await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      const activeSessionId = await createSessionWithChildren("active", tx);
      const recentSessionId = await createSessionWithChildren("recently-expired", tx);
      const expiredSessionIds = [
        await createSessionWithChildren("eligible-expired", tx),
        await createSessionWithChildren("eligible-expired", tx)
      ];
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 10,
        maxBatches: 10
      });

      const result = await service.cleanupExpiredGuestSessions();

      expect(result.deletedSessionCount).toBe(2);
      await expectGuestSessionWithChildren(activeSessionId, true, tx);
      await expectGuestSessionWithChildren(recentSessionId, true, tx);
      for (const sessionId of expiredSessionIds) {
        await expectGuestSessionWithChildren(sessionId, false, tx);
      }
    });
  });

  it("uses bounded batches and deletes all eligible rows across service batches", async () => {
    await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      const activeSessionId = await createSessionWithChildren("active", tx);
      await createSessionWithChildren("eligible-expired", tx);
      await createSessionWithChildren("eligible-expired", tx);
      await createSessionWithChildren("eligible-expired", tx);

      const firstBatchDeleted =
      await transactionRepositories.guestSessionCleanup.deleteExpiredGuestSessionsBatch({
        batchSize: 2
      });
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 2,
        maxBatches: 10
      });

      const result = await service.cleanupExpiredGuestSessions();

      expect(firstBatchDeleted).toBe(2);
      expect(result.deletedSessionCount).toBe(1);
      await expectGuestSessionWithChildren(activeSessionId, true, tx);
    });
  });

  it("is safe to rerun after all eligible rows were deleted", async () => {
    await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      await createSessionWithChildren("eligible-expired", tx);
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 10,
        maxBatches: 10
      });

      const firstResult = await service.cleanupExpiredGuestSessions();
      const secondResult = await service.cleanupExpiredGuestSessions();

      expect(firstResult.deletedSessionCount).toBe(1);
      expect(secondResult.deletedSessionCount).toBe(0);
    });
  });

  it("preserves sessions at the eligibility boundary and deletes strictly older sessions", async () => {
    const result = await connection.db.transaction(async (tx) => {
      const transactionRepositories = createPostgresRepositories(tx);
      const boundarySessionId = await createSessionWithChildren(
        "boundary-expired",
        tx
      );
      const olderSessionId = await createSessionWithChildren("eligible-expired", tx);
      const service = new GuestSessionCleanupService(transactionRepositories, {
        batchSize: 10,
        maxBatches: 10
      });

      return {
        cleanup: await service.cleanupExpiredGuestSessions(),
        boundarySessionId,
        olderSessionId
      };
    });

    expect(result.cleanup.deletedSessionCount).toBe(1);
    await expectGuestSessionWithChildren(result.boundarySessionId, true);
    await expectGuestSessionWithChildren(result.olderSessionId, false);
  });

  it("keeps concurrent cleanup operations safe", async () => {
    const activeSessionId = await createSessionWithChildren("active");
    await Promise.all([
      createSessionWithChildren("eligible-expired"),
      createSessionWithChildren("eligible-expired"),
      createSessionWithChildren("eligible-expired")
    ]);
    const firstService = new GuestSessionCleanupService(repositories, {
      batchSize: 2,
      maxBatches: 10
    });
    const secondService = new GuestSessionCleanupService(repositories, {
      batchSize: 2,
      maxBatches: 10
    });

    const [firstResult, secondResult] = await Promise.all([
      firstService.cleanupExpiredGuestSessions(),
      secondService.cleanupExpiredGuestSessions()
    ]);

    expect(firstResult.deletedSessionCount + secondResult.deletedSessionCount).toBe(3);
    await expectGuestSessionWithChildren(activeSessionId, true);
    const remainingEligible = await countEligibleExpiredSessions();
    expect(remainingEligible).toBe(0);
  });
});

function tomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

type SessionAge = "active" | "recently-expired" | "boundary-expired" | "eligible-expired";

async function createSessionWithChildren(
  age: SessionAge,
  db: Pick<typeof connection.db, "execute"> = connection.db
) {
  const [session] = (await db.execute<{ id: string }>(sql`
    with created_session as (
      insert into guest_sessions (expires_at)
      values (${expiresAtExpression(age)})
      returning id
    ),
    created_shipment as (
      insert into shipments (guest_session_id, reference, state)
      select id, 'CLEANUP-TEST', 'draft'
      from created_session
      returning id, guest_session_id
    ),
    created_event as (
      insert into shipment_events (
        guest_session_id,
        shipment_id,
        event_type,
        actor_role,
        previous_state,
        next_state
      )
      select
        guest_session_id,
        id,
        'shipment_created',
        'dispatcher',
        'draft',
        'draft'
      from created_shipment
    ),
    created_usage as (
      insert into guest_session_usage_limits (
        guest_session_id,
        rate_window_started_at,
        updated_at
      )
      select id, now(), now()
      from created_session
    )
    select id from created_session
  `)).rows;

  if (!session) {
    throw new Error("Failed to create test guest session.");
  }

  return session.id;
}

function expiresAtExpression(age: SessionAge) {
  switch (age) {
    case "active":
      return sql`now() + interval '1 hour'`;
    case "recently-expired":
      return sql`now() - interval '23 hours'`;
    case "boundary-expired":
      return sql`now() - interval '24 hours'`;
    case "eligible-expired":
      return sql`now() - interval '25 hours'`;
  }
}

async function expectGuestSessionWithChildren(
  sessionId: string,
  expectedPresent: boolean,
  db: Pick<typeof connection.db, "execute"> = connection.db
) {
  const [counts] = (await db.execute<{
    session_count: number;
    shipment_count: number;
    event_count: number;
    usage_count: number;
  }>(sql`
    select
      (select count(*)::integer from guest_sessions where id = ${sessionId}) as session_count,
      (select count(*)::integer from shipments where guest_session_id = ${sessionId}) as shipment_count,
      (select count(*)::integer from shipment_events where guest_session_id = ${sessionId}) as event_count,
      (select count(*)::integer from guest_session_usage_limits where guest_session_id = ${sessionId}) as usage_count
  `)).rows;

  const expectedCount = expectedPresent ? 1 : 0;

  expect(counts).toEqual({
    session_count: expectedCount,
    shipment_count: expectedCount,
    event_count: expectedCount,
    usage_count: expectedCount
  });
}

async function countEligibleExpiredSessions() {
  const [result] = (await connection.db.execute<{ count: number }>(sql`
    select count(*)::integer as count
    from guest_sessions
    where expires_at < now() - interval '24 hours'
  `)).rows;

  return result?.count ?? 0;
}

async function deleteCleanupTestSessions() {
  await connection.db.execute(sql`
    delete from guest_sessions
    where exists (
      select 1
      from shipments
      where shipments.guest_session_id = guest_sessions.id
        and shipments.reference = 'CLEANUP-TEST'
    )
  `);
}
