import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  bigserial,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { demoRoles, shipmentWorkflowStates } from "@etrn-flow/shared";

const workflowStateSqlList = shipmentWorkflowStates
  .map((state) => `'${state}'`)
  .join(", ");

const demoRoleSqlList = demoRoles.map((role) => `'${role}'`).join(", ");

export const guestSessions = pgTable("guest_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
});

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guestSessionId: uuid("guest_session_id")
      .notNull()
      .references(() => guestSessions.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    state: text("state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    guestSessionReferenceUnique: uniqueIndex(
      "shipments_guest_session_reference_unique"
    ).on(table.guestSessionId, table.reference),
    guestSessionIndex: index("shipments_guest_session_idx").on(table.guestSessionId),
    guestSessionShipmentUnique: unique("shipments_guest_session_id_unique").on(
      table.guestSessionId,
      table.id
    ),
    stateCheck: check(
      "shipments_state_check",
      sql.raw(`${table.state.name} in (${workflowStateSqlList})`)
    )
  })
);

export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sequence: bigserial("sequence", { mode: "number" }).unique(),
    guestSessionId: uuid("guest_session_id")
      .notNull()
      .references(() => guestSessions.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    actorRole: text("actor_role").notNull(),
    previousState: text("previous_state").notNull(),
    nextState: text("next_state").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    shipmentEventsGuestShipmentIdx: index(
      "shipment_events_guest_session_shipment_idx"
    ).on(table.guestSessionId, table.shipmentId),
    shipmentEventsSequenceIdx: index("shipment_events_sequence_idx").on(table.sequence),
    sameGuestSessionShipmentFk: foreignKey({
      columns: [table.guestSessionId, table.shipmentId],
      foreignColumns: [shipments.guestSessionId, shipments.id],
      name: "shipment_events_same_guest_session_fk"
    }).onDelete("cascade"),
    actorRoleCheck: check(
      "shipment_events_actor_role_check",
      sql.raw(`${table.actorRole.name} in (${demoRoleSqlList})`)
    ),
    previousStateCheck: check(
      "shipment_events_previous_state_check",
      sql.raw(`${table.previousState.name} in (${workflowStateSqlList})`)
    ),
    nextStateCheck: check(
      "shipment_events_next_state_check",
      sql.raw(`${table.nextState.name} in (${workflowStateSqlList})`)
    )
  })
);
