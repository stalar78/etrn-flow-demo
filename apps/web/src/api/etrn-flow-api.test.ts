import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EtrnFlowApiError,
  executeShipmentAction,
  getShipmentDetail,
  listShipments,
  resetDemo
} from "./etrn-flow-api";

describe("ETRN Flow API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses relative same-origin endpoints with credentials", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      shipments: []
    }));
    vi.stubGlobal("fetch", fetchMock);

    await listShipments();

    expect(fetchMock).toHaveBeenCalledWith("/api/shipments", expect.objectContaining({
      credentials: "same-origin",
      method: "GET"
    }));
  });

  it("turns non-success responses into controlled API errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(
      { error: "transition_conflict" },
      { ok: false, status: 409 }
    )));

    await expect(listShipments()).rejects.toMatchObject({
      code: "transition_conflict"
    });
  });

  it("parses valid shipment list and detail responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        shipments: [shipmentSummary()]
      }))
      .mockResolvedValueOnce(jsonResponse({
        shipment: shipmentSummary(),
        events: [shipmentEvent({ sequence: 2 }), shipmentEvent({ sequence: 1 })]
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listShipments()).resolves.toEqual({
      shipments: [shipmentSummary()]
    });
    await expect(getShipmentDetail("shipment-1")).resolves.toEqual({
      shipment: shipmentSummary(),
      events: [shipmentEvent({ sequence: 2 }), shipmentEvent({ sequence: 1 })]
    });
  });

  it("sends only action and actorRole for a transition request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      transition: {
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      },
      event: shipmentEvent({ eventType: "markVehicleArrived" })
    }));
    vi.stubGlobal("fetch", fetchMock);

    await executeShipmentAction("shipment-1", {
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });

    const [, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });
    expect(String(options.body)).not.toContain("guestSessionId");
    expect(String(options.body)).not.toContain("nextState");
  });

  it("posts demo reset without a request body", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ reset: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resetDemo()).resolves.toEqual({ reset: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/demo/reset", expect.objectContaining({
      body: undefined,
      credentials: "same-origin",
      headers: undefined,
      method: "POST"
    }));
  });

  it("maps demo reset unavailable into a controlled API error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(
      { error: "demo_reset_unavailable" },
      { ok: false, status: 503 }
    )));

    await expect(resetDemo()).rejects.toMatchObject({
      code: "demo_reset_unavailable"
    });
  });

  it("rejects unexpected successful response shapes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ shipments: [{ state: "raw" }] })));

    await expect(listShipments()).rejects.toBeInstanceOf(EtrnFlowApiError);
  });
});

function jsonResponse(body: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    json: async () => body,
    ok: options.ok ?? true,
    status: options.status ?? 200
  } as Response;
}

function shipmentSummary() {
  return {
    id: "shipment-1",
    reference: "DEMO-001",
    state: "awaiting_loading",
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:05:00.000Z"
  };
}

function shipmentEvent(overrides: Partial<ReturnType<typeof baseShipmentEvent>> = {}) {
  return {
    ...baseShipmentEvent(),
    ...overrides
  };
}

function baseShipmentEvent() {
  return {
    id: "event-1",
    sequence: 1,
    eventType: "dispatch",
    actorRole: "dispatcher",
    previousState: "ready_for_dispatch",
    nextState: "awaiting_loading",
    payload: {},
    createdAt: "2026-08-02T10:02:00.000Z"
  };
}
