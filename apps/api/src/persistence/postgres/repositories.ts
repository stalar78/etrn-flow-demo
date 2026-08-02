import { and, asc, eq } from "drizzle-orm";

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
  "insert" | "select" | "update"
> & {
  transaction?: ReturnType<
    typeof import("../../db/connection.js").createDatabaseConnection
  >["db"]["transaction"];
};

export function createPostgresRepositories(db: DbClient): PostgresRepositories {
  return {
    guestSessions: new PostgresGuestSessionRepository(db),
    shipments: new PostgresShipmentRepository(db),
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
  shipments: ShipmentRepository;
  shipmentEvents: ShipmentEventRepository;
  transaction<T>(operation: (repositories: PostgresRepositories) => Promise<T>): Promise<T>;
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
      .orderBy(asc(shipments.createdAt), asc(shipments.id));

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
      .orderBy(asc(shipmentEvents.createdAt), asc(shipmentEvents.id));

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
