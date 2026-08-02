import type {
  AppendShipmentEventInput,
  CreateShipmentInput,
  ShipmentRecord
} from "@etrn-flow/domain";

import type { PostgresRepositories } from "../persistence/postgres/repositories.js";

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
        actorRole: "warehouse",
        previousState: "awaiting_unloading",
        nextState: "unloading",
        payload: {}
      },
      {
        eventType: "complete_unloading",
        actorRole: "warehouse",
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
  constructor(private readonly repositories: PostgresRepositories) {}

  async bootstrap(guestSessionId: string): Promise<DemoBootstrapResult> {
    try {
      return await this.repositories.transaction(async (transactionalRepositories) => {
        const existingCount =
          await transactionalRepositories.shipments.countByReferences({
            guestSessionId,
            references: demoReferences
          });

        if (existingCount === demoShipmentDefinitions.length) {
          return {
            created: false,
            shipmentCount: existingCount
          };
        }

        for (const definition of demoShipmentDefinitions) {
          const shipment = await transactionalRepositories.shipments.create({
            guestSessionId,
            reference: definition.reference,
            state: definition.state
          });

          await appendEvents(transactionalRepositories, guestSessionId, shipment, definition);
        }

        return {
          created: true,
          shipmentCount: demoShipmentDefinitions.length
        };
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
}

const demoReferences = demoShipmentDefinitions.map((definition) => definition.reference);

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
