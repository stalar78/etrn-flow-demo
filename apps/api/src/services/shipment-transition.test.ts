import { describe, expect, it, vi } from "vitest";

import type {
  AppendShipmentEventInput,
  CreateShipmentInput,
  GuestSessionRepository,
  ShipmentRecord,
  UpdateShipmentStateInput
} from "@etrn-flow/domain";

import type { PostgresRepositories } from "../persistence/postgres/repositories.js";
import { ShipmentTransitionService } from "./shipment-transition.js";

describe("ShipmentTransitionService", () => {
  it("executes an allowed action and returns the domain-determined next state", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "awaiting_loading" })
    });
    const service = new ShipmentTransitionService(repositories);

    const result = await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    expect(result).toMatchObject({
      kind: "success",
      transition: {
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      }
    });
  });

  it("executes an unloading action through the same guarded persistence path", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "in_transit" })
    });
    const service = new ShipmentTransitionService(repositories);

    const result = await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "arriveForUnloading",
      actorRole: "driver"
    });

    expect(result).toMatchObject({
      kind: "success",
      transition: {
        shipmentId: "shipment-1",
        action: "arriveForUnloading",
        actorRole: "driver",
        previousState: "in_transit",
        nextState: "awaiting_unloading"
      }
    });
    expect(repositories.shipments.updateStateGuarded).toHaveBeenCalledWith({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      expectedState: "in_transit",
      nextState: "awaiting_unloading"
    });
    expect(repositories.shipmentEvents.append).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "arriveForUnloading",
      actorRole: "driver",
      previousState: "in_transit",
      nextState: "awaiting_unloading"
    }));
  });

  it("uses the loaded current state as the guarded update expectation", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "awaiting_loading" })
    });
    const service = new ShipmentTransitionService(repositories);

    await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    expect(repositories.shipments.updateStateGuarded).toHaveBeenCalledWith({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      expectedState: "awaiting_loading",
      nextState: "loading"
    });
  });

  it("appends one matching event after a successful guarded update", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "awaiting_loading" })
    });
    const service = new ShipmentTransitionService(repositories);

    await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    expect(repositories.shipmentEvents.append).toHaveBeenCalledOnce();
    expect(repositories.shipmentEvents.append).toHaveBeenCalledWith({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      eventType: "markVehicleArrived",
      actorRole: "warehouse",
      previousState: "awaiting_loading",
      nextState: "loading",
      payload: {
        source: "workflow_transition_api"
      }
    });
  });

  it("returns not_found when the scoped shipment is missing", async () => {
    const repositories = createRepositoryStub({ shipment: null });
    const service = new ShipmentTransitionService(repositories);

    const result = await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    expect(result).toEqual({ kind: "not_found" });
    expect(repositories.shipments.updateStateGuarded).not.toHaveBeenCalled();
    expect(repositories.shipmentEvents.append).not.toHaveBeenCalled();
  });

  it("rejects a forbidden actor role before persistence mutation", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "awaiting_loading" })
    });
    const service = new ShipmentTransitionService(repositories);

    const result = await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "driver"
    });

    expect(result).toEqual({ kind: "forbidden" });
    expect(repositories.shipments.updateStateGuarded).not.toHaveBeenCalled();
    expect(repositories.shipmentEvents.append).not.toHaveBeenCalled();
  });

  it("rejects an invalid current-state transition before persistence mutation", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "in_transit" })
    });
    const service = new ShipmentTransitionService(repositories);

    const result = await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    expect(result).toEqual({ kind: "invalid_transition" });
    expect(repositories.shipments.updateStateGuarded).not.toHaveBeenCalled();
    expect(repositories.shipmentEvents.append).not.toHaveBeenCalled();
  });

  it("returns a conflict when the guarded update affects no row", async () => {
    const repositories = createRepositoryStub({
      shipment: shipmentRecord({ state: "awaiting_loading" }),
      guardedUpdateResult: null
    });
    const service = new ShipmentTransitionService(repositories);

    const result = await service.execute({
      guestSessionId: "session-1",
      shipmentId: "shipment-1",
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    expect(result).toEqual({ kind: "conflict" });
    expect(repositories.shipmentEvents.append).not.toHaveBeenCalled();
  });

  it("propagates repository and transaction failures as infrastructure failures", async () => {
    const repositories = createRepositoryStub({
      transactionError: new Error("database unavailable")
    });
    const service = new ShipmentTransitionService(repositories);

    await expect(
      service.execute({
        guestSessionId: "session-1",
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse"
      })
    ).rejects.toThrow("database unavailable");
  });
});

function createRepositoryStub(options: {
  shipment?: ShipmentRecord | null;
  guardedUpdateResult?: ShipmentRecord | null;
  transactionError?: Error;
} = {}) {
  const shipment = "shipment" in options
    ? options.shipment
    : shipmentRecord({ state: "awaiting_loading" });
  const repositories = {} as PostgresRepositories;
  const transaction: PostgresRepositories["transaction"] = async (operation) => {
    if (options.transactionError) {
      throw options.transactionError;
    }

    return operation(repositories);
  };

  Object.assign(repositories, {
    guestSessions: {} as GuestSessionRepository,
    guestSessionUsage: {
      consumeBurst: vi.fn(),
      consumeMutationQuota: vi.fn(),
      consumeResetQuota: vi.fn()
    },
    shipments: {
      create: vi.fn(async (input: CreateShipmentInput) =>
        shipmentRecord({
          guestSessionId: input.guestSessionId,
          reference: input.reference,
          state: input.state
        })
      ),
      countByReferences: vi.fn(),
      findByIdScoped: vi.fn(async () => shipment),
      listByGuestSession: vi.fn(),
      updateStateGuarded: vi.fn(async (input: UpdateShipmentStateInput) =>
        options.guardedUpdateResult === undefined
          ? shipmentRecord({
            id: input.shipmentId,
            guestSessionId: input.guestSessionId,
            state: input.nextState
          })
          : options.guardedUpdateResult
      )
    },
    shipmentEvents: {
      append: vi.fn(async (input: AppendShipmentEventInput) => ({
        id: "event-1",
        sequence: 1,
        guestSessionId: input.guestSessionId,
        shipmentId: input.shipmentId,
        eventType: input.eventType,
        actorRole: input.actorRole,
        previousState: input.previousState,
        nextState: input.nextState,
        payload: input.payload ?? {},
        createdAt: new Date("2026-08-02T10:00:00.000Z")
      })),
      listForShipmentScoped: vi.fn()
    },
    transaction
  });

  return repositories;
}

function shipmentRecord(overrides: Partial<ShipmentRecord>): ShipmentRecord {
  const now = new Date("2026-08-02T10:00:00.000Z");

  return {
    id: "shipment-1",
    guestSessionId: "session-1",
    reference: "DEMO-001",
    state: "awaiting_loading",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
