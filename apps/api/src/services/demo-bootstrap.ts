import type {
  AppendShipmentEventInput,
  CreateShipmentInput,
  ShipmentRecord
} from "@etrn-flow/domain";

import type { PostgresRepositories } from "../persistence/postgres/repositories.js";
import type { GuestSessionUsageService, QuotaGuardResult } from "./guest-session-usage.js";

type DemoShipmentDefinition = {
  reference: string;
  state: CreateShipmentInput["state"];
  events: Array<Omit<AppendShipmentEventInput, "guestSessionId" | "shipmentId">>;
};

export type DemoBootstrapResult = {
  created: boolean;
  shipmentCount: number;
};

export const demoShipmentDefinitions = [
  {
    reference: "DEMO-001",
    state: "awaiting_loading",
    events: [
      {
        eventType: "shipment_created",
        actorRole: "dispatcher",
        previousState: "draft",
        nextState: "ready_for_dispatch",
        payload: { scenario: "early-stage" }
      },
      {
        eventType: "dispatch",
        actorRole: "dispatcher",
        previousState: "ready_for_dispatch",
        nextState: "awaiting_loading",
        payload: {}
      }
    ]
  },
  {
    reference: "DEMO-002",
    state: "in_transit",
    events: [
      {
        eventType: "shipment_created",
        actorRole: "dispatcher",
        previousState: "draft",
        nextState: "ready_for_dispatch",
        payload: { scenario: "in-transit" }
      },
      {
        eventType: "dispatch",
        actorRole: "dispatcher",
        previousState: "ready_for_dispatch",
        nextState: "awaiting_loading",
        payload: {}
      },
      {
        eventType: "mark_vehicle_arrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading",
        payload: {}
      },
      {
        eventType: "complete_loading",
        actorRole: "warehouse",
        previousState: "loading",
        nextState: "in_transit",
        payload: {}
      }
    ]
  },
  {
    reference: "DEMO-003",
    state: "completed",
    events: [
      {
        eventType: "shipment_created",
        actorRole: "dispatcher",
        previousState: "draft",
        nextState: "ready_for_dispatch",
        payload: { scenario: "completed" }
      },
      {
        eventType: "dispatch",
        actorRole: "dispatcher",
        previousState: "ready_for_dispatch",
        nextState: "awaiting_loading",
        payload: {}
      },
      {
        eventType: "mark_vehicle_arrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading",
        payload: {}
      },
      {
        eventType: "complete_loading",
        actorRole: "warehouse",
        previousState: "loading",
        nextState: "in_transit",
        payload: {}
      },
      {
        eventType: "arrive_for_unloading",
        actorRole: "driver",
        previousState: "in_transit",
        nextState: "awaiting_unloading",
        payload: {}
      },
      {
        eventType: "start_unloading",
        actorRole: "consignee",
        previousState: "awaiting_unloading",
        nextState: "unloading",
        payload: {}
      },
      {
        eventType: "complete_unloading",
        actorRole: "consignee",
        previousState: "unloading",
        nextState: "awaiting_confirmation",
        payload: {}
      },
      {
        eventType: "complete_shipment",
        actorRole: "consignee",
        previousState: "awaiting_confirmation",
        nextState: "completed",
        payload: {}
      }
    ]
  }
] satisfies DemoShipmentDefinition[];

export class DemoBootstrapService {
  constructor(
    private readonly repositories: PostgresRepositories,
    private readonly usageService?: GuestSessionUsageService
  ) {}

  async bootstrap(guestSessionId: string): Promise<DemoBootstrapResult | QuotaGuardResult> {
    try {
      return await this.repositories.transaction(async (transactionalRepositories) => {
        return this.bootstrapInTransaction(transactionalRepositories, guestSessionId);
      });
    } catch (error) {
      const existingCount = await this.repositories.shipments.countByReferences({
        guestSessionId,
        references: demoReferences
      });

      if (existingCount === demoShipmentDefinitions.length) {
        return {
          created: false,
          shipmentCount: existingCount
        };
      }

      throw error;
    }
  }

  async bootstrapInTransaction(
    repositories: PostgresRepositories,
    guestSessionId: string
  ): Promise<DemoBootstrapResult | QuotaGuardResult> {
    const existingCount =
      await repositories.shipments.countByReferences({
        guestSessionId,
        references: demoReferences
      });

    if (existingCount === demoShipmentDefinitions.length) {
      return {
        created: false,
        shipmentCount: existingCount
      };
    }

    const quota = await this.usageService?.consumeMutationQuota(repositories, guestSessionId);
    if (quota && !quota.allowed) {
      return quota;
    }

    await createDemoShipments(repositories, guestSessionId);

    return {
      created: true,
      shipmentCount: demoShipmentDefinitions.length
    };
  }
}

export class DemoResetService {
  constructor(
    private readonly repositories: PostgresRepositories,
    private readonly usageService?: GuestSessionUsageService
  ) {}

  async reset(guestSessionId: string): Promise<{ reset: true } | QuotaGuardResult> {
    return this.repositories.transaction((transactionalRepositories) =>
      this.resetInTransaction(transactionalRepositories, guestSessionId)
    );
  }

  async resetInTransaction(
    repositories: PostgresRepositories,
    guestSessionId: string
  ): Promise<{ reset: true } | QuotaGuardResult> {
    await repositories.demoReset.lockGuestSession(guestSessionId);

    const quota = await this.usageService?.consumeResetQuota(repositories, guestSessionId);
    if (quota && !quota.allowed) {
      return quota;
    }

    await repositories.demoReset.deleteEventsByGuestSession(guestSessionId);
    await repositories.demoReset.deleteShipmentsByGuestSession(guestSessionId);
    await createDemoShipments(repositories, guestSessionId);
    return { reset: true };
  }
}

const demoReferences = demoShipmentDefinitions.map((definition) => definition.reference);

async function createDemoShipments(
  repositories: PostgresRepositories,
  guestSessionId: string
) {
  for (const definition of demoShipmentDefinitions) {
    const shipment = await repositories.shipments.create({
      guestSessionId,
      reference: definition.reference,
      state: definition.state
    });

    await appendEvents(repositories, guestSessionId, shipment, definition);
  }
}

async function appendEvents(
  repositories: PostgresRepositories,
  guestSessionId: string,
  shipment: ShipmentRecord,
  definition: DemoShipmentDefinition
) {
  for (const event of definition.events) {
    await repositories.shipmentEvents.append({
      guestSessionId,
      shipmentId: shipment.id,
      ...event
    });
  }
}
