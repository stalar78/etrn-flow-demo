import { describe, expect, it } from "vitest";

import { applyShipmentWorkflowAction } from "./shipment-workflow.js";

describe("shipment workflow", () => {
  it("applies valid dispatcher transitions", () => {
    const result = applyShipmentWorkflowAction({
      state: "draft",
      action: "prepareDispatch",
      actorRole: "dispatcher"
    });

    expect(result).toEqual({
      ok: true,
      previousState: "draft",
      nextState: "ready_for_dispatch",
      action: "prepareDispatch",
      actorRole: "dispatcher"
    });
  });

  it.each([
    {
      state: "in_transit",
      action: "arriveForUnloading",
      actorRole: "driver",
      nextState: "awaiting_unloading"
    },
    {
      state: "awaiting_unloading",
      action: "startUnloading",
      actorRole: "consignee",
      nextState: "unloading"
    },
    {
      state: "unloading",
      action: "completeUnloading",
      actorRole: "consignee",
      nextState: "awaiting_confirmation"
    },
    {
      state: "awaiting_confirmation",
      action: "completeShipment",
      actorRole: "consignee",
      nextState: "completed"
    }
  ] as const)("applies $action from $state", ({ state, action, actorRole, nextState }) => {
    const result = applyShipmentWorkflowAction({
      state,
      action,
      actorRole
    });

    expect(result).toEqual({
      ok: true,
      previousState: state,
      nextState,
      action,
      actorRole
    });
  });

  it.each([
    {
      state: "in_transit",
      action: "arriveForUnloading",
      actorRole: "warehouse"
    },
    {
      state: "awaiting_unloading",
      action: "startUnloading",
      actorRole: "driver"
    },
    {
      state: "unloading",
      action: "completeUnloading",
      actorRole: "warehouse"
    },
    {
      state: "awaiting_confirmation",
      action: "completeShipment",
      actorRole: "driver"
    }
  ] as const)("rejects the wrong role for $action", ({ state, action, actorRole }) => {
    const result = applyShipmentWorkflowAction({
      state,
      action,
      actorRole
    });

    expect(result).toMatchObject({
      ok: false,
      state,
      reason: "unauthorized_role"
    });
  });

  it.each([
    {
      state: "loading",
      action: "arriveForUnloading",
      actorRole: "driver"
    },
    {
      state: "in_transit",
      action: "startUnloading",
      actorRole: "consignee"
    },
    {
      state: "awaiting_unloading",
      action: "completeUnloading",
      actorRole: "consignee"
    },
    {
      state: "unloading",
      action: "completeShipment",
      actorRole: "consignee"
    }
  ] as const)("rejects the wrong source state for $action", ({ state, action, actorRole }) => {
    const result = applyShipmentWorkflowAction({
      state,
      action,
      actorRole
    });

    expect(result).toMatchObject({
      ok: false,
      state,
      reason: "invalid_source_state"
    });
  });

  it("keeps completed shipments terminal", () => {
    const result = applyShipmentWorkflowAction({
      state: "completed",
      action: "completeShipment",
      actorRole: "consignee"
    });

    expect(result).toMatchObject({
      ok: false,
      state: "completed",
      reason: "terminal_state"
    });
  });

  it.each([
    {
      state: "in_transit",
      action: "reportAttention",
      actorRole: "driver",
      nextState: "attention_required"
    },
    {
      state: "attention_required",
      action: "resolveAttention",
      actorRole: "manager",
      nextState: "in_transit"
    }
  ] as const)("applies exception branch action $action from $state", ({ state, action, actorRole, nextState }) => {
    const result = applyShipmentWorkflowAction({
      state,
      action,
      actorRole
    });

    expect(result).toEqual({
      ok: true,
      previousState: state,
      nextState,
      action,
      actorRole
    });
  });

  it.each([
    {
      state: "in_transit",
      action: "reportAttention",
      actorRole: "manager"
    },
    {
      state: "attention_required",
      action: "resolveAttention",
      actorRole: "driver"
    }
  ] as const)("rejects the wrong role for exception action $action", ({ state, action, actorRole }) => {
    const result = applyShipmentWorkflowAction({
      state,
      action,
      actorRole
    });

    expect(result).toMatchObject({
      ok: false,
      state,
      reason: "unauthorized_role"
    });
  });

  it.each([
    {
      state: "loading",
      action: "reportAttention",
      actorRole: "driver"
    },
    {
      state: "in_transit",
      action: "resolveAttention",
      actorRole: "manager"
    }
  ] as const)("rejects the wrong source state for exception action $action", ({ state, action, actorRole }) => {
    const result = applyShipmentWorkflowAction({
      state,
      action,
      actorRole
    });

    expect(result).toMatchObject({
      ok: false,
      state,
      reason: "invalid_source_state"
    });
  });

  it("does not treat attention_required as terminal", () => {
    const result = applyShipmentWorkflowAction({
      state: "attention_required",
      action: "resolveAttention",
      actorRole: "manager"
    });

    expect(result).toMatchObject({
      ok: true,
      previousState: "attention_required",
      nextState: "in_transit"
    });
  });

  it("rejects an invalid source state", () => {
    const result = applyShipmentWorkflowAction({
      state: "awaiting_loading",
      action: "prepareDispatch",
      actorRole: "dispatcher"
    });

    expect(result).toMatchObject({
      ok: false,
      state: "awaiting_loading",
      reason: "invalid_source_state"
    });
  });

  it("rejects an unauthorized role", () => {
    const result = applyShipmentWorkflowAction({
      state: "ready_for_dispatch",
      action: "dispatch",
      actorRole: "driver"
    });

    expect(result).toMatchObject({
      ok: false,
      state: "ready_for_dispatch",
      reason: "unauthorized_role"
    });
  });

  it("protects cancelled shipments from later transitions", () => {
    const result = applyShipmentWorkflowAction({
      state: "cancelled",
      action: "dispatch",
      actorRole: "dispatcher"
    });

    expect(result).toMatchObject({
      ok: false,
      state: "cancelled",
      reason: "terminal_state"
    });
  });

  it("preserves the original state value on failure", () => {
    const state = "draft";
    const result = applyShipmentWorkflowAction({
      state,
      action: "completeLoading",
      actorRole: "warehouse"
    });

    expect(state).toBe("draft");
    expect(result).toMatchObject({
      ok: false,
      state: "draft",
      reason: "invalid_source_state"
    });
  });
});
