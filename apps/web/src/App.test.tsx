import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { EtrnFlowApiError, type ShipmentDetailResponse } from "./api/etrn-flow-api";
import * as api from "./api/etrn-flow-api";

vi.mock("./api/etrn-flow-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api/etrn-flow-api")>();

  return {
    ...actual,
    bootstrapDemo: vi.fn(),
    executeShipmentAction: vi.fn(),
    getHealth: vi.fn(),
    getSession: vi.fn(),
    getShipmentDetail: vi.fn(),
    listShipments: vi.fn()
  };
});

const mockedApi = vi.mocked(api);

describe("App", () => {
  beforeEach(() => {
    mockedApi.getHealth.mockResolvedValue({
      status: "ok",
      service: "etrn-flow-api"
    });
    mockedApi.getSession.mockResolvedValue({
      session: {
        id: "hidden-session-id",
        created: true,
        expiresAt: "2026-08-03T10:00:00.000Z"
      }
    });
    mockedApi.bootstrapDemo.mockResolvedValue({
      demo: {
        created: true,
        shipmentCount: 3
      }
    });
    mockedApi.listShipments.mockResolvedValue({
      shipments: [
        shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
        shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
      ]
    });
    mockedApi.getShipmentDetail.mockResolvedValue(detailFor("shipment-1"));
    mockedApi.executeShipmentAction.mockResolvedValue({
      transition: {
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      },
      event: shipmentEvent({
        id: "event-transition",
        sequence: 3,
        eventType: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows initialization, bootstraps data, and selects DEMO-001 by default", async () => {
    render(<App />);

    expect(screen.getByText("Подключаемся к API и готовим демо-сеанс...")).toBeInTheDocument();

    await screen.findByRole("button", { name: /DEMO-001/i });

    expect(mockedApi.bootstrapDemo).toHaveBeenCalledOnce();
    expect(mockedApi.listShipments).toHaveBeenCalled();
    expect(mockedApi.getShipmentDetail).toHaveBeenCalledWith("shipment-1");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
  });

  it("renders shipment records, selected detail, Russian labels, disclaimer, and ordered timeline", async () => {
    mockedApi.getShipmentDetail.mockResolvedValueOnce(detailFor("shipment-1", {
      events: [
        shipmentEvent({ id: "event-2", sequence: 2, eventType: "dispatch" }),
        shipmentEvent({ id: "event-1", sequence: 1, eventType: "shipment_created" })
      ]
    }));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });

    expect(screen.getByText("Демонстрационный интерфейс. Используются только синтетические данные.")).toBeInTheDocument();
    expect(screen.getAllByText("Ожидает прибытия на погрузку").length).toBeGreaterThan(0);
    expect(screen.queryByText("awaiting_loading")).not.toBeInTheDocument();
    expect(screen.getByText("Подтвердить прибытие автомобиля")).toBeInTheDocument();
    expect(screen.queryByText("Завершить погрузку")).not.toBeInTheDocument();

    const timelineItems = screen.getAllByRole("listitem");
    expect(within(timelineItems[0]).getByText("#1")).toBeInTheDocument();
    expect(within(timelineItems[1]).getByText("#2")).toBeInTheDocument();
  });

  it("executes an action, disables the control, refreshes list and detail, and renders server state", async () => {
    let resolveTransition: () => void = () => undefined;
    mockedApi.executeShipmentAction.mockReturnValueOnce(new Promise((resolve) => {
      resolveTransition = () => resolve({
        transition: {
          shipmentId: "shipment-1",
          action: "markVehicleArrived",
          actorRole: "warehouse",
          previousState: "awaiting_loading",
          nextState: "loading"
        },
        event: shipmentEvent({ eventType: "markVehicleArrived" })
      });
    }));
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })
        ]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockResolvedValueOnce(detailFor("shipment-1", {
        shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })
      }));

    render(<App />);

    const action = await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i });
    fireEvent.click(action);

    expect(action).toBeDisabled();
    resolveTransition();

    await screen.findByText("Действие выполнено. Состояние и история обновлены.");
    expect(mockedApi.executeShipmentAction).toHaveBeenCalledWith("shipment-1", {
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });
    expect(screen.getAllByText("Погрузка").length).toBeGreaterThan(0);
  });

  it("refreshes stale data after a transition conflict", async () => {
    mockedApi.executeShipmentAction.mockRejectedValueOnce(new EtrnFlowApiError("transition_conflict"));
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })]
      })
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockResolvedValueOnce(detailFor("shipment-1", {
        shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })
      }));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    await screen.findByText("Состояние перевозки уже изменилось. Данные обновлены.");
    expect(screen.getAllByText("Погрузка").length).toBeGreaterThan(0);
  });

  it("shows a retry control on initialization failure", async () => {
    mockedApi.getHealth.mockRejectedValueOnce(new EtrnFlowApiError("request_failed"));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(screen.getByText("API временно недоступен. Проверьте запуск сервера.")).toBeInTheDocument();
  });

  it("loads another shipment and prevents stale detail from replacing the latest selection", async () => {
    let resolveFirstSelection: (value: ShipmentDetailResponse) => void = () => undefined;
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveFirstSelection = resolve;
      }))
      .mockResolvedValueOnce(detailFor("shipment-1"));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /DEMO-002/i }));
    fireEvent.click(screen.getByRole("button", { name: /DEMO-001/i }));
    resolveFirstSelection(detailFor("shipment-2"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
      expect(screen.getAllByText("DEMO-001").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("DEMO-002")).toBeInTheDocument();
    expect(screen.getAllByText("Ожидает прибытия на погрузку").length).toBeGreaterThan(0);
  });
});

function shipmentSummary(overrides: Partial<ShipmentDetailResponse["shipment"]> = {}) {
  return {
    id: "shipment-1",
    reference: "DEMO-001",
    state: "awaiting_loading" as const,
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:05:00.000Z",
    ...overrides
  };
}

function detailFor(
  shipmentId: string,
  overrides: Partial<ShipmentDetailResponse> = {}
): ShipmentDetailResponse {
  const shipment = shipmentId === "shipment-2"
    ? shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" })
    : shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" });

  return {
    shipment,
    events: [
      shipmentEvent({ id: "event-1", sequence: 1, eventType: "shipment_created" }),
      shipmentEvent({ id: "event-2", sequence: 2, eventType: "dispatch" })
    ],
    ...overrides
  };
}

function shipmentEvent(overrides: Partial<ShipmentDetailResponse["events"][number]> = {}) {
  return {
    id: "event-1",
    sequence: 1,
    eventType: "dispatch",
    actorRole: "dispatcher" as const,
    previousState: "ready_for_dispatch" as const,
    nextState: "awaiting_loading" as const,
    payload: {},
    createdAt: "2026-08-02T10:02:00.000Z",
    ...overrides
  };
}
