import { describe, expect, it, vi } from "vitest";

import type {
  AppendShipmentEventInput,
  CreateShipmentInput,
  GuestSessionRepository,
  ShipmentRecord
} from "@etrn-flow/domain";

import { DemoBootstrapService, demoShipmentDefinitions } from "./demo-bootstrap.js";
import type { PostgresRepositories } from "../persistence/postgres/repositories.js";

describe("DemoBootstrapService", () => {
  it("creates exactly three deterministic shipments for an empty session", async () => {
    const repositories = createRepositoryStub();
    const service = new DemoBootstrapService(repositories);

    const result = await service.bootstrap("session-1");

    expect(result).toEqual({ created: true, shipmentCount: 3 });
    expect(repositories.shipments.create).toHaveBeenCalledTimes(3);
    expect(createdReferences(repositories)).toEqual(["DEMO-001", "DEMO-002", "DEMO-003"]);
  });

  it("is idempotent when all demo references already exist", async () => {
    const repositories = createRepositoryStub({ existingCount: 3 });
    const service = new DemoBootstrapService(repositories);

    const result = await service.bootstrap("session-1");

    expect(result).toEqual({ created: false, shipmentCount: 3 });
    expect(repositories.shipments.create).not.toHaveBeenCalled();
  });

  it("creates event histories that correspond to shipment states", async () => {
    const repositories = createRepositoryStub();
    const service = new DemoBootstrapService(repositories);

    await service.bootstrap("session-1");

    const appendedEvents = vi.mocked(repositories.shipmentEvents.append).mock.calls.map(
      ([event]: [AppendShipmentEventInput]) => event
    );

    for (const definition of demoShipmentDefinitions) {
      expect(appendedEvents).toContainEqual(
        expect.objectContaining({
          nextState: definition.state
        })
      );
    }
  });

  it("propagates transaction failures when idempotency cannot be confirmed", async () => {
    const repositories = createRepositoryStub({
      transactionError: new Error("transaction failed")
    });
    vi.mocked(repositories.shipments.countByReferences).mockResolvedValueOnce(0);
    const service = new DemoBootstrapService(repositories);

    await expect(service.bootstrap("session-1")).rejects.toThrow("transaction failed");
  });
});

function createRepositoryStub(options: { existingCount?: number; transactionError?: Error } = {}) {
  let shipmentNumber = 0;
  const repositories = {} as PostgresRepositories;
  const transaction: PostgresRepositories["transaction"] = async (operation) => {
    if (options.transactionError) {
      throw options.transactionError;
    }

    return operation(repositories);
  };

  Object.assign(repositories, {
    guestSessions: {} as GuestSessionRepository,
    shipments: {
      create: vi.fn(async (input: CreateShipmentInput) => {
        shipmentNumber += 1;

        return shipmentRecord({
          id: `shipment-${shipmentNumber}`,
          guestSessionId: input.guestSessionId,
          reference: input.reference,
          state: input.state
        });
      }),
      countByReferences: vi.fn(async () => options.existingCount ?? 0),
      findByIdScoped: vi.fn(),
      listByGuestSession: vi.fn(),
      updateStateGuarded: vi.fn()
    },
    shipmentEvents: {
      append: vi.fn(async (input: AppendShipmentEventInput) => ({
        id: `event-${input.eventType}`,
        sequence: 1,
        guestSessionId: input.guestSessionId,
        shipmentId: input.shipmentId,
        eventType: input.eventType,
        actorRole: input.actorRole,
        previousState: input.previousState,
        nextState: input.nextState,
        payload: input.payload ?? {},
        createdAt: new Date()
      })),
      listForShipmentScoped: vi.fn()
    },
    transaction
  });

  return repositories;
}

function createdReferences(repositories: ReturnType<typeof createRepositoryStub>) {
  return vi.mocked(repositories.shipments.create).mock.calls.map(
    ([input]: [CreateShipmentInput]) => input.reference
  );
}

function shipmentRecord(overrides: Partial<ShipmentRecord>): ShipmentRecord {
  const now = new Date("2026-08-02T10:00:00.000Z");

  return {
    id: "shipment-id",
    guestSessionId: "session-id",
    reference: "DEMO-001",
    state: "draft",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
