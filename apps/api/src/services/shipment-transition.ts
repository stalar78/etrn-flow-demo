import {
  applyShipmentWorkflowAction,
  type ShipmentEventRecord,
  type ShipmentWorkflowAction
} from "@etrn-flow/domain";
import type { DemoRole, ShipmentWorkflowState } from "@etrn-flow/shared";

import type { PostgresRepositories } from "../persistence/postgres/repositories.js";

export type ExecuteShipmentTransitionInput = {
  guestSessionId: string;
  shipmentId: string;
  action: ShipmentWorkflowAction;
  actorRole: DemoRole;
};

export type ShipmentTransitionSuccess = {
  kind: "success";
  transition: {
    shipmentId: string;
    action: ShipmentWorkflowAction;
    actorRole: DemoRole;
    previousState: ShipmentWorkflowState;
    nextState: ShipmentWorkflowState;
  };
  event: ShipmentEventRecord;
};

export type ShipmentTransitionFailure =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "invalid_transition" }
  | { kind: "conflict" };

export type ShipmentTransitionResult =
  | ShipmentTransitionSuccess
  | ShipmentTransitionFailure;

export class ShipmentTransitionService {
  constructor(private readonly repositories: PostgresRepositories) {}

  async execute(input: ExecuteShipmentTransitionInput): Promise<ShipmentTransitionResult> {
    return this.repositories.transaction(async (transactionalRepositories) => {
      const shipment = await transactionalRepositories.shipments.findByIdScoped({
        guestSessionId: input.guestSessionId,
        shipmentId: input.shipmentId
      });

      if (!shipment) {
        return { kind: "not_found" };
      }

      const workflowResult = applyShipmentWorkflowAction({
        state: shipment.state,
        action: input.action,
        actorRole: input.actorRole
      });

      if (!workflowResult.ok) {
        return {
          kind: workflowResult.reason === "unauthorized_role"
            ? "forbidden"
            : "invalid_transition"
        };
      }

      const updatedShipment = await transactionalRepositories.shipments.updateStateGuarded({
        guestSessionId: input.guestSessionId,
        shipmentId: shipment.id,
        expectedState: workflowResult.previousState,
        nextState: workflowResult.nextState
      });

      if (!updatedShipment) {
        return { kind: "conflict" };
      }

      const event = await transactionalRepositories.shipmentEvents.append({
        guestSessionId: input.guestSessionId,
        shipmentId: shipment.id,
        eventType: workflowResult.action,
        actorRole: workflowResult.actorRole,
        previousState: workflowResult.previousState,
        nextState: workflowResult.nextState,
        payload: {
          source: "workflow_transition_api"
        }
      });

      return {
        kind: "success",
        transition: {
          shipmentId: shipment.id,
          action: workflowResult.action,
          actorRole: workflowResult.actorRole,
          previousState: workflowResult.previousState,
          nextState: workflowResult.nextState
        },
        event
      };
    });
  }
}
