import type { DemoRole, ShipmentWorkflowState } from "@etrn-flow/shared";

export const shipmentWorkflowActions = [
  "prepareDispatch",
  "dispatch",
  "markVehicleArrived",
  "completeLoading",
  "arriveForUnloading",
  "startUnloading",
  "completeUnloading",
  "completeShipment",
  "reportAttention",
  "resolveAttention",
  "cancel"
] as const;

export type ShipmentWorkflowAction = (typeof shipmentWorkflowActions)[number];

type TransitionRule = {
  from: ShipmentWorkflowState;
  to: ShipmentWorkflowState;
  roles: readonly DemoRole[];
};

const transitionRules: Record<ShipmentWorkflowAction, TransitionRule> = {
  prepareDispatch: {
    from: "draft",
    to: "ready_for_dispatch",
    roles: ["dispatcher"]
  },
  dispatch: {
    from: "ready_for_dispatch",
    to: "awaiting_loading",
    roles: ["dispatcher"]
  },
  markVehicleArrived: {
    from: "awaiting_loading",
    to: "loading",
    roles: ["warehouse"]
  },
  completeLoading: {
    from: "loading",
    to: "in_transit",
    roles: ["warehouse"]
  },
  arriveForUnloading: {
    from: "in_transit",
    to: "awaiting_unloading",
    roles: ["driver"]
  },
  startUnloading: {
    from: "awaiting_unloading",
    to: "unloading",
    roles: ["consignee"]
  },
  completeUnloading: {
    from: "unloading",
    to: "awaiting_confirmation",
    roles: ["consignee"]
  },
  completeShipment: {
    from: "awaiting_confirmation",
    to: "completed",
    roles: ["consignee"]
  },
  reportAttention: {
    from: "in_transit",
    to: "attention_required",
    roles: ["driver"]
  },
  resolveAttention: {
    from: "attention_required",
    to: "in_transit",
    roles: ["manager"]
  },
  cancel: {
    from: "draft",
    to: "cancelled",
    roles: ["dispatcher"]
  }
};

const protectedTerminalStates = new Set<ShipmentWorkflowState>([
  "completed",
  "cancelled"
]);

export type ShipmentWorkflowSuccess = {
  ok: true;
  previousState: ShipmentWorkflowState;
  nextState: ShipmentWorkflowState;
  action: ShipmentWorkflowAction;
  actorRole: DemoRole;
};

export type ShipmentWorkflowFailure = {
  ok: false;
  state: ShipmentWorkflowState;
  action: ShipmentWorkflowAction;
  actorRole: DemoRole;
  reason:
    | "terminal_state"
    | "unauthorized_role"
    | "invalid_source_state";
  message: string;
};

export type ShipmentWorkflowResult =
  | ShipmentWorkflowSuccess
  | ShipmentWorkflowFailure;

export function applyShipmentWorkflowAction(input: {
  state: ShipmentWorkflowState;
  action: ShipmentWorkflowAction;
  actorRole: DemoRole;
}): ShipmentWorkflowResult {
  const rule = transitionRules[input.action];

  if (protectedTerminalStates.has(input.state)) {
    return {
      ok: false,
      state: input.state,
      action: input.action,
      actorRole: input.actorRole,
      reason: "terminal_state",
      message: `Cannot apply ${input.action} when shipment is ${input.state}.`
    };
  }

  if (!rule.roles.includes(input.actorRole)) {
    return {
      ok: false,
      state: input.state,
      action: input.action,
      actorRole: input.actorRole,
      reason: "unauthorized_role",
      message: `${input.actorRole} cannot apply ${input.action}.`
    };
  }

  if (input.state !== rule.from) {
    return {
      ok: false,
      state: input.state,
      action: input.action,
      actorRole: input.actorRole,
      reason: "invalid_source_state",
      message: `${input.action} requires shipment state ${rule.from}.`
    };
  }

  return {
    ok: true,
    previousState: input.state,
    nextState: rule.to,
    action: input.action,
    actorRole: input.actorRole
  };
}
