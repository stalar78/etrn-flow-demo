import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type {
  AppendShipmentEventInput,
  CreateGuestSessionInput,
  CreateShipmentInput,
  GuestSessionRepository,
  ShipmentEventRepository,
  ShipmentRepository,
  UpdateShipmentStateInput
} from "@etrn-flow/domain";
import type { DemoRole, ShipmentWorkflowState } from "@etrn-flow/shared";

import { guestSessions, shipmentEvents, shipments } from "../../db/schema.js";

type DbClient = Pick<
  Parameters<Parameters<ReturnType<typeof import("../../db/connection.js").createDatabaseConnection>["db"]["transaction"]>[0]>[0],
  "delete" | "execute" | "insert" | "select" | "update"
> & {
  transaction?: ReturnType<
    typeof import("../../db/connection.js").createDatabaseConnection
  >["db"]["transaction"];
};

export function createPostgresRepositories(db: DbClient): PostgresRepositories {
  return {
    guestSessions: new PostgresGuestSessionRepository(db),
    guestSessionCleanup: new PostgresGuestSessionCleanupRepository(db),
    guestSessionUsage: new PostgresGuestSessionUsageRepository(db),
    shipments: new PostgresShipmentRepository(db),
    demoReset: new PostgresDemoResetRepository(db),
    shipmentEvents: new PostgresShipmentEventRepository(db),
    async transaction<T>(operation: (repositories: PostgresRepositories) => Promise<T>) {
      if (!db.transaction) {
        throw new Error("Nested transactions are not supported by this repository boundary.");
      }

      return db.transaction(async (tx) =>
        operation(createPostgresRepositories(tx))
      );
    }
  };
}

export type PostgresRepositories = {
  guestSessions: GuestSessionRepository;
  guestSessionCleanup: GuestSessionCleanupRepository;
  guestSessionUsage: GuestSessionUsageRepository;
  shipments: ShipmentRepository;
  demoReset: DemoResetRepository;
  shipmentEvents: ShipmentEventRepository;
  transaction<T>(operation: (repositories: PostgresRepositories) => Promise<T>): Promise<T>;
};

export type DeleteExpiredGuestSessionsBatchInput = {
  batchSize: number;
};

export type GuestSessionCleanupRepository = {
  deleteExpiredGuestSessionsBatch(
    input: DeleteExpiredGuestSessionsBatchInput
  ): Promise<number>;
};

export type ConsumeBurstInput = {
  guestSessionId: string;
  limit: number;
  now: Date;
  windowSeconds: number;
};

export type ConsumeBurstResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export type ConsumeMutationQuotaInput = {
  guestSessionId: string;
  limit: number;
};

export type ConsumeResetQuotaInput = {
  guestSessionId: string;
  mutationLimit: number;
  resetLimit: number;
};

export type ConsumeQuotaResult =
  | { allowed: true }
  | { allowed: false; reason: "mutation_quota" | "reset_quota" };

export type GuestSessionUsageRepository = {
  consumeBurst(input: ConsumeBurstInput): Promise<ConsumeBurstResult>;
  consumeMutationQuota(input: ConsumeMutationQuotaInput): Promise<ConsumeQuotaResult>;
  consumeResetQuota(input: ConsumeResetQuotaInput): Promise<ConsumeQuotaResult>;
};

export type DemoResetRepository = {
  deleteEventsByGuestSession(guestSessionId: string): Promise<void>;
  deleteShipmentsByGuestSession(guestSessionId: string): Promise<void>;
  lockGuestSession(guestSessionId: string): Promise<void>;
};

class PostgresGuestSessionRepository implements GuestSessionRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateGuestSessionInput) {
    const [record] = await this.db
      .insert(guestSessions)
      .values({
        expiresAt: input.expiresAt
      })
      .returning();

    return record;
  }

  async findById(id: string) {
    const [record] = await this.db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.id, id))
      .limit(1);

    return record ?? null;
  }

  async touchLastSeen(input: { id: string; lastSeenAt: Date }) {
    const [record] = await this.db
      .update(guestSessions)
      .set({
        lastSeenAt: input.lastSeenAt
      })
      .where(eq(guestSessions.id, input.id))
      .returning();

    return record ?? null;
  }
}

class PostgresGuestSessionCleanupRepository implements GuestSessionCleanupRepository {
  constructor(private readonly db: DbClient) {}

  async deleteExpiredGuestSessionsBatch(input: DeleteExpiredGuestSessionsBatchInput) {
    const records = await this.db.execute<{ deleted_count: number }>(sql`
      with eligible_sessions as (
        select id
        from guest_sessions
        where expires_at < now() - interval '24 hours'
        order by expires_at asc, id asc
        limit ${input.batchSize}
        for update skip locked
      ),
      deleted_sessions as (
        delete from guest_sessions
        using eligible_sessions
        where guest_sessions.id = eligible_sessions.id
        returning guest_sessions.id
      )
      select count(*)::integer as deleted_count from deleted_sessions
    `);

    return records.rows[0]?.deleted_count ?? 0;
  }
}

class PostgresGuestSessionUsageRepository implements GuestSessionUsageRepository {
  constructor(private readonly db: DbClient) {}

  async consumeBurst(input: ConsumeBurstInput): Promise<ConsumeBurstResult> {
    await this.db.execute(sql`
      insert into guest_session_usage_limits (
        guest_session_id,
        rate_window_started_at,
        rate_window_count,
        updated_at
      )
      values (${input.guestSessionId}, ${input.now}, 0, ${input.now})
      on conflict (guest_session_id) do nothing
    `);

    const records = await this.db.execute<{
      allowed: boolean;
      retry_after_seconds: number | null;
    }>(sql`
      with current_usage as (
        select
          guest_session_id,
          rate_window_started_at,
          rate_window_count,
          (
            ${input.now} >= rate_window_started_at + (${input.windowSeconds} * interval '1 second')
          ) as window_expired
        from guest_session_usage_limits
        where guest_session_id = ${input.guestSessionId}
        for update
      ),
      updated_usage as (
        update guest_session_usage_limits usage
        set
          rate_window_started_at = case
            when current_usage.window_expired then ${input.now}
            else usage.rate_window_started_at
          end,
          rate_window_count = case
            when current_usage.window_expired then 1
            else usage.rate_window_count + 1
          end,
          updated_at = ${input.now}
        from current_usage
        where usage.guest_session_id = current_usage.guest_session_id
          and (
            current_usage.window_expired
            or current_usage.rate_window_count < ${input.limit}
          )
        returning true as allowed, null::integer as retry_after_seconds
      )
      select allowed, retry_after_seconds from updated_usage
      union all
      select
        false as allowed,
        greatest(
          1,
          ceil(extract(epoch from (
            current_usage.rate_window_started_at
            + (${input.windowSeconds} * interval '1 second')
            - ${input.now}
          )))::integer
        ) as retry_after_seconds
      from current_usage
      where not current_usage.window_expired
        and current_usage.rate_window_count >= ${input.limit}
        and not exists (select 1 from updated_usage)
      limit 1
    `);
    const record = records.rows[0];

    if (!record) {
      throw new Error("Guest session burst consumption did not return a result.");
    }

    if (record.allowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfterSeconds: record.retry_after_seconds ?? 1
    };
  }

  async consumeMutationQuota(input: ConsumeMutationQuotaInput): Promise<ConsumeQuotaResult> {
    await this.db.execute(sql`
      insert into guest_session_usage_limits (
        guest_session_id,
        rate_window_started_at,
        updated_at
      )
      values (${input.guestSessionId}, now(), now())
      on conflict (guest_session_id) do nothing
    `);

    const records = await this.db.execute<{ allowed: boolean }>(sql`
      update guest_session_usage_limits
      set
        mutation_count = mutation_count + 1,
        updated_at = now()
      where guest_session_id = ${input.guestSessionId}
        and mutation_count < ${input.limit}
      returning true as allowed
    `);

    return records.rows[0]?.allowed
      ? { allowed: true }
      : { allowed: false, reason: "mutation_quota" };
  }

  async consumeResetQuota(input: ConsumeResetQuotaInput): Promise<ConsumeQuotaResult> {
    await this.db.execute(sql`
      insert into guest_session_usage_limits (
        guest_session_id,
        rate_window_started_at,
        updated_at
      )
      values (${input.guestSessionId}, now(), now())
      on conflict (guest_session_id) do nothing
    `);

    const records = await this.db.execute<{
      mutation_allowed: boolean;
      reset_allowed: boolean;
    }>(sql`
      update guest_session_usage_limits
      set
        mutation_count = mutation_count + 1,
        reset_count = reset_count + 1,
        updated_at = now()
      where guest_session_id = ${input.guestSessionId}
        and reset_count < ${input.resetLimit}
        and mutation_count < ${input.mutationLimit}
      returning true as mutation_allowed, true as reset_allowed
    `);

    if (records.rows[0]) {
      return { allowed: true };
    }

    const [current] = (await this.db.execute<{
      mutation_count: number;
      reset_count: number;
    }>(sql`
      select mutation_count, reset_count
      from guest_session_usage_limits
      where guest_session_id = ${input.guestSessionId}
      limit 1
    `)).rows;

    if ((current?.reset_count ?? input.resetLimit) >= input.resetLimit) {
      return { allowed: false, reason: "reset_quota" };
    }

    return { allowed: false, reason: "mutation_quota" };
  }
}

class PostgresShipmentRepository implements ShipmentRepository {
  constructor(private readonly db: DbClient) {}

  async create(input: CreateShipmentInput) {
    const [record] = await this.db
      .insert(shipments)
      .values(input)
      .returning();

    return coerceShipmentRecord(record);
  }

  async countByReferences(input: { guestSessionId: string; references: string[] }) {
    if (input.references.length === 0) {
      return 0;
    }

    const records = await this.db
      .select({ id: shipments.id })
      .from(shipments)
      .where(
        and(
          eq(shipments.guestSessionId, input.guestSessionId),
          inArray(shipments.reference, input.references)
        )
      );

    return records.length;
  }

  async findByIdScoped(input: { guestSessionId: string; shipmentId: string }) {
    const [record] = await this.db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.guestSessionId, input.guestSessionId),
          eq(shipments.id, input.shipmentId)
        )
      )
      .limit(1);

    return record ? coerceShipmentRecord(record) : null;
  }

  async listByGuestSession(guestSessionId: string) {
    const records = await this.db
      .select()
      .from(shipments)
      .where(eq(shipments.guestSessionId, guestSessionId))
      .orderBy(desc(shipments.updatedAt), asc(shipments.id));

    return records.map(coerceShipmentRecord);
  }

  async updateStateGuarded(input: UpdateShipmentStateInput) {
    const [record] = await this.db
      .update(shipments)
      .set({
        state: input.nextState,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(shipments.guestSessionId, input.guestSessionId),
          eq(shipments.id, input.shipmentId),
          eq(shipments.state, input.expectedState)
        )
      )
      .returning();

    return record ? coerceShipmentRecord(record) : null;
  }
}

class PostgresDemoResetRepository implements DemoResetRepository {
  constructor(private readonly db: DbClient) {}

  async lockGuestSession(guestSessionId: string) {
    await this.db.execute(sql`select pg_advisory_xact_lock(hashtext(${guestSessionId}))`);
  }

  async deleteEventsByGuestSession(guestSessionId: string) {
    await this.db
      .delete(shipmentEvents)
      .where(eq(shipmentEvents.guestSessionId, guestSessionId));
  }

  async deleteShipmentsByGuestSession(guestSessionId: string) {
    await this.db
      .delete(shipments)
      .where(eq(shipments.guestSessionId, guestSessionId));
  }
}

class PostgresShipmentEventRepository implements ShipmentEventRepository {
  constructor(private readonly db: DbClient) {}

  async append(input: AppendShipmentEventInput) {
    const [record] = await this.db
      .insert(shipmentEvents)
      .values({
        ...input,
        payload: input.payload ?? {}
      })
      .returning();

    return coerceShipmentEventRecord(record);
  }

  async listForShipmentScoped(input: { guestSessionId: string; shipmentId: string }) {
    const records = await this.db
      .select()
      .from(shipmentEvents)
      .where(
        and(
          eq(shipmentEvents.guestSessionId, input.guestSessionId),
          eq(shipmentEvents.shipmentId, input.shipmentId)
        )
      )
      .orderBy(asc(shipmentEvents.sequence));

    return records.map(coerceShipmentEventRecord);
  }
}

function coerceShipmentRecord(record: typeof shipments.$inferSelect) {
  return {
    ...record,
    state: record.state as ShipmentWorkflowState
  };
}

function coerceShipmentEventRecord(record: typeof shipmentEvents.$inferSelect) {
  return {
    ...record,
    actorRole: record.actorRole as DemoRole,
    previousState: record.previousState as ShipmentWorkflowState,
    nextState: record.nextState as ShipmentWorkflowState,
    payload: record.payload as Record<string, unknown>
  };
}
