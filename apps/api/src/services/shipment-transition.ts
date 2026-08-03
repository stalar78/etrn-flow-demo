import {
  applyShipmentWorkflowAction,
  type ShipmentEventRecord,
  type ShipmentWorkflowAction
} from "@etrn-flow/domain";
import type { DemoRole, ShipmentWorkflowState } from "@etrn-flow/shared";

import type { PostgresRepositories } from "../persistence/postgres/repositories.js";
import type { GuestSessionUsageService, QuotaGuardResult } from "./guest-session-usage.js";

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
  | { kind: "conflict" }
  | { kind: "mutation_quota" };

export type ShipmentTransitionResult =
  | ShipmentTransitionSuccess
  | ShipmentTransitionFailure;

export class ShipmentTransitionService {
  constructor(
    private readonly repositories: PostgresRepositories,
    private readonly usageService?: GuestSessionUsageService
  ) {}

  async execute(input: ExecuteShipmentTransitionInput): Promise<ShipmentTransitionResult> {
    try {
      return await this.repositories.transaction((transactionalRepositories) =>
        this.executeInTransaction(transactionalRepositories, input)
      );
    } catch (error) {
      if (error instanceof TransitionConflictRollback) {
        return { kind: "conflict" };
      }

      throw error;
    }
  }

  async executeInTransaction(
    repositories: PostgresRepositories,
    input: ExecuteShipmentTransitionInput
  ): Promise<ShipmentTransitionResult> {
    const shipment = await repositories.shipments.findByIdScoped({
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

      const quota = await this.usageService?.consumeMutationQuota(
        repositories,
        input.guestSessionId
      );
      if (isQuotaFailure(quota)) {
        return { kind: "mutation_quota" };
      }

      const updatedShipment = await repositories.shipments.updateStateGuarded({
        guestSessionId: input.guestSessionId,
        shipmentId: shipment.id,
        expectedState: workflowResult.previousState,
        nextState: workflowResult.nextState
      });

      if (!updatedShipment) {
        throw new TransitionConflictRollback();
      }

      const event = await repositories.shipmentEvents.append({
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
  }
}

function isQuotaFailure(result: QuotaGuardResult | undefined): result is Extract<QuotaGuardResult, { allowed: false }> {
  return Boolean(result && !result.allowed);
}

class TransitionConflictRollback extends Error {}
