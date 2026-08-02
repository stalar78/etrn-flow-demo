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
