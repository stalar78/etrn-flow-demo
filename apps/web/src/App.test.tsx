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
    listShipments: vi.fn(),
    resetDemo: vi.fn()
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
    mockedApi.resetDemo.mockResolvedValue({ reset: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows initialization, bootstraps data, and selects DEMO-001 by default", async () => {
    render(<App />);

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Демо системы для управления этапами перевозки"
    })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/Начните с DEMO-001 и последовательно пройдите перевозку/)).toBeInTheDocument();
    expect(screen.getByText(/Демо работает только с синтетическими данными/)).toBeInTheDocument();
    expect(screen.getByText(/одним независимым разработчиком StalarVision/)).toBeInTheDocument();
    expect(screen.getByText("Последовательный процесс от погрузки до завершения")).toBeInTheDocument();
    expect(screen.getByText("Роли и управляемое отклонение с возвратом в процесс")).toBeInTheDocument();
    expect(screen.getByText("История событий после каждого изменения")).toBeInTheDocument();

    const commercialHeading = screen.getByRole("heading", {
      name: "Если похожий процесс есть в вашей компании"
    });
    expect(commercialHeading.closest("section")).toHaveAttribute("aria-labelledby", "commercial-next-step-title");
    expect(screen.getByText("Рабочий процесс")).toBeInTheDocument();
    expect(screen.getByText("Данные и существующие системы")).toBeInTheDocument();
    expect(screen.getByText("Интерфейс для пользователей")).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: "Обсудить свою задачу" });
    expect(cta).toHaveAttribute("href", "https://stalarvision.ru");
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta).toHaveAttribute("rel", "noreferrer");
    expect(screen.queryByRole("link", { name: "Обсудить похожую систему" })).not.toBeInTheDocument();
    expect(screen.getByText("О возможностях демо")).toBeInTheDocument();
    expect(screen.getAllByText(/управляемое отклонение с возвратом в процесс/).length).toBeGreaterThan(1);
    expect(screen.getByText("Подключаемся к API и готовим демо-сеанс...")).toBeInTheDocument();

    await screen.findByRole("button", { name: /DEMO-001/i });

    expect(mockedApi.bootstrapDemo).toHaveBeenCalledOnce();
    expect(mockedApi.listShipments).toHaveBeenCalled();
    expect(mockedApi.getShipmentDetail).toHaveBeenCalledWith("shipment-1");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Основной путь перевозки")).toBeInTheDocument();
    expect(screen.getByText("Отклонение и восстановление")).toBeInTheDocument();
    const snapshot = getOperationalSnapshot();
    expect(snapshot.getByText("Всего перевозок")).toBeInTheDocument();
    expect(snapshot.getByText("Требуют внимания")).toBeInTheDocument();
    expect(snapshot.getByText("Завершены")).toBeInTheDocument();
    expectSnapshotMetric(snapshot, "Всего перевозок", "2");
    expectSnapshotMetric(snapshot, "Требуют внимания", "0");
    expectSnapshotMetric(snapshot, "Завершены", "0");

    const guidedDemo = getGuidedDemoPanel();
    expect(guidedDemo.getByText(/прибытие автомобиля/iu)).toBeInTheDocument();
    const guidedSteps = guidedDemo.getAllByRole("listitem");
    expect(within(guidedSteps[0]).getByText("Прибытие и погрузка")).toBeInTheDocument();
    expect(within(guidedSteps[0]).getByText("Текущий шаг")).toBeInTheDocument();
    expect(within(guidedSteps[1]).getByText("Перевозка")).toBeInTheDocument();
    expect(within(guidedSteps[1]).getByText("Ещё не выполнено")).toBeInTheDocument();
    expect(within(guidedSteps[2]).getByText("Разгрузка")).toBeInTheDocument();
    expect(within(guidedSteps[2]).getByText("Ещё не выполнено")).toBeInTheDocument();
    expect(within(guidedSteps[3]).getByText("Завершение")).toBeInTheDocument();
    expect(within(guidedSteps[3]).getByText("Ещё не выполнено")).toBeInTheDocument();
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

    const timelineItems = getTimelineItems();
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
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toBeDisabled();
    resolveTransition();

    await screen.findByText("Действие выполнено. Состояние и история обновлены.");
    expect(mockedApi.executeShipmentAction).toHaveBeenCalledWith("shipment-1", {
      action: "markVehicleArrived",
      actorRole: "warehouse"
    });
    expect(screen.getAllByText("Погрузка").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Завершить погрузку/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();

    const guidedDemo = getGuidedDemoPanel();
    expect(guidedDemo.getByText(/Теперь завершите погрузку/iu)).toBeInTheDocument();
    const guidedSteps = guidedDemo.getAllByRole("listitem");
    expect(within(guidedSteps[0]).getByText("Пройдено")).toBeInTheDocument();
    expect(within(guidedSteps[1]).getByText("Текущий шаг")).toBeInTheDocument();
    expect(within(guidedSteps[2]).getByText("Ещё не выполнено")).toBeInTheDocument();
  });

  it("executes the full DEMO-001 path and renders the completed guided flow", async () => {
    const transitions = [
      {
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading",
        buttonName: /Подтвердить прибытие автомобиля/i
      },
      {
        action: "completeLoading",
        actorRole: "warehouse",
        previousState: "loading",
        nextState: "in_transit",
        buttonName: /Завершить погрузку/i
      },
      {
        action: "arriveForUnloading",
        actorRole: "driver",
        previousState: "in_transit",
        nextState: "awaiting_unloading",
        buttonName: /Подтвердить прибытие к разгрузке/i
      },
      {
        action: "startUnloading",
        actorRole: "consignee",
        previousState: "awaiting_unloading",
        nextState: "unloading",
        buttonName: /Начать разгрузку/i
      },
      {
        action: "completeUnloading",
        actorRole: "consignee",
        previousState: "unloading",
        nextState: "awaiting_confirmation",
        buttonName: /Завершить разгрузку/i
      },
      {
        action: "completeShipment",
        actorRole: "consignee",
        previousState: "awaiting_confirmation",
        nextState: "completed",
        buttonName: /Подтвердить завершение перевозки/i
      }
    ] as const;
    const states = [
      "awaiting_loading",
      ...transitions.map((transition) => transition.nextState)
    ] as const;
    let listCall = 0;
    let detailCall = 0;
    mockedApi.listShipments.mockImplementation(async () => {
      const state = states[Math.min(listCall, states.length - 1)];
      listCall += 1;

      return {
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state })]
      };
    });
    mockedApi.getShipmentDetail.mockImplementation(async () => {
      const state = states[Math.min(detailCall, states.length - 1)];
      const appliedTransitions = transitions.slice(0, detailCall);
      detailCall += 1;

      return detailFor("shipment-1", {
        events: detailFor("shipment-1").events.concat(
          appliedTransitions.map((transition, index) =>
            shipmentEvent({
              id: `event-${index + 3}`,
              sequence: index + 3,
              eventType: transition.action,
              actorRole: transition.actorRole,
              previousState: transition.previousState,
              nextState: transition.nextState
            })
          )
        ),
        shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state })
      });
    });

    render(<App />);

    for (const transition of transitions) {
      fireEvent.click(await screen.findByRole("button", { name: transition.buttonName }));
    }

    await screen.findByText("Перевозка завершена. История событий доступна ниже.");
    transitions.forEach((transition, index) => {
      expect(mockedApi.executeShipmentAction).toHaveBeenNthCalledWith(index + 1, "shipment-1", {
        action: transition.action,
        actorRole: transition.actorRole
      });
    });

    const timelineItems = getTimelineItems();
    expect(within(timelineItems[2]).getByText("#3")).toBeInTheDocument();
    expect(within(timelineItems[7]).getByText("#8")).toBeInTheDocument();
    const guidedDemo = getGuidedDemoPanel();
    expect(guidedDemo.getByText(/Сценарий завершён/iu)).toBeInTheDocument();
    for (const guidedStep of guidedDemo.getAllByRole("listitem")) {
      expect(within(guidedStep).getByText("Пройдено")).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /Подтвердить завершение перевозки/i })).not.toBeInTheDocument();
  });

  it("shows a neutral guided note for prepared examples outside DEMO-001", async () => {
    mockedApi.getShipmentDetail.mockImplementation(async (shipmentId) => detailFor(shipmentId));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /DEMO-002/i }));

    const guidedDemo = getGuidedDemoPanel("DEMO-002");
    expect(await guidedDemo.findByText(/Сообщить о проблеме/iu)).toBeInTheDocument();
    expect(guidedDemo.getByText(/обработку отклонения/iu)).toBeInTheDocument();
    expect(guidedDemo.queryByText(/прибытие автомобиля/iu)).not.toBeInTheDocument();
    expect(guidedDemo.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows a DEMO-003 guided title with a neutral prepared-example note", async () => {
    mockedApi.listShipments.mockResolvedValueOnce({
      shipments: [
        shipmentSummary({ id: "shipment-3", reference: "DEMO-003", state: "completed" }),
        shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
      ]
    });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockResolvedValueOnce(detailFor("shipment-3", {
        shipment: shipmentSummary({ id: "shipment-3", reference: "DEMO-003", state: "completed" })
      }));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    expect(screen.getByText("Завершённый пример")).toBeInTheDocument();
    expectSnapshotMetric(getOperationalSnapshot(), "Завершены", "1");
    fireEvent.click(screen.getByRole("button", { name: /DEMO-003/i }));

    const guidedDemo = getGuidedDemoPanel("DEMO-003");
    expect(await guidedDemo.findByText("Вы просматриваете подготовленный пример другого этапа перевозки.")).toBeInTheDocument();
    expect(guidedDemo.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("runs the DEMO-002 attention branch and returns to the normal lifecycle", async () => {
    const demo002InTransit = detailFor("shipment-2");
    const demo002Attention = detailFor("shipment-2", {
      events: demo002InTransit.events.concat(shipmentEvent({
        id: "event-attention",
        sequence: 5,
        eventType: "reportAttention",
        actorRole: "driver",
        previousState: "in_transit",
        nextState: "attention_required"
      })),
      shipment: shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "attention_required" })
    });
    const demo002Resolved = detailFor("shipment-2", {
      events: demo002Attention.events.concat(shipmentEvent({
        id: "event-resolved",
        sequence: 6,
        eventType: "resolveAttention",
        actorRole: "manager",
        previousState: "attention_required",
        nextState: "in_transit"
      })),
      shipment: shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" })
    });

    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "attention_required" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "reset-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" }),
          shipmentSummary({ id: "reset-3", reference: "DEMO-003", state: "completed" })
        ]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockResolvedValueOnce(demo002InTransit)
      .mockResolvedValueOnce(demo002Attention)
      .mockResolvedValueOnce(demo002Resolved)
      .mockResolvedValueOnce(detailFor("reset-1", {
        shipment: shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" })
      }));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /DEMO-002/i }));

    const guidedDemo = getGuidedDemoPanel("DEMO-002");
    expect(await guidedDemo.findByText(/Сообщить о проблеме/iu)).toBeInTheDocument();
    expect(guidedDemo.getByText(/обработку отклонения/iu)).toBeInTheDocument();
    expectSnapshotMetric(getOperationalSnapshot(), "Требуют внимания", "0");
    expect(screen.getByRole("button", { name: /Сообщить о проблеме/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Водитель/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Сообщить о проблеме/i }));

    expect((await screen.findAllByText("Требует внимания")).length).toBeGreaterThan(0);
    expectSnapshotMetric(getOperationalSnapshot(), "Требуют внимания", "1");
    expect(await guidedDemo.findByText(/Проблема уже зафиксирована/iu)).toBeInTheDocument();
    expect(guidedDemo.getByText(/Подтвердить решение проблемы/iu)).toBeInTheDocument();
    expect(guidedDemo.getByText(/вернуть перевозку в обычный процесс/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Подтвердить решение проблемы/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Менеджер/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Проблема зафиксирована" })).toBeInTheDocument();
    expect(screen.getByText(/Исключение:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Подтвердить решение проблемы/i }));

    expect((await screen.findAllByText("В пути")).length).toBeGreaterThan(0);
    expectSnapshotMetric(getOperationalSnapshot(), "Требуют внимания", "0");
    expect(await guidedDemo.findByText(/Сообщить о проблеме/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Подтвердить прибытие к разгрузке/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Проблема обработана" })).toBeInTheDocument();
    expect(mockedApi.executeShipmentAction).toHaveBeenNthCalledWith(1, "shipment-2", {
      action: "reportAttention",
      actorRole: "driver"
    });
    expect(mockedApi.executeShipmentAction).toHaveBeenNthCalledWith(2, "shipment-2", {
      action: "resolveAttention",
      actorRole: "manager"
    });

    fireEvent.click(screen.getByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Демо восстановлено в исходное состояние.");
    expect(screen.getByRole("button", { name: /DEMO-002/i })).toHaveTextContent("В пути");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
  });

  it("opens and cancels demo reset confirmation without calling the API", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Начать демо заново/i }));

    expect(mockedApi.resetDemo).not.toHaveBeenCalled();
    expect(screen.getByText("Все изменения в текущих синтетических данных будут сброшены.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Не сбрасывать/i }));

    expect(screen.queryByText("Все изменения в текущих синтетических данных будут сброшены.")).not.toBeInTheDocument();
    expect(mockedApi.resetDemo).not.toHaveBeenCalled();
  });

  it("disables reset confirmation while a workflow transition is active", async () => {
    const transition = deferred<Awaited<ReturnType<typeof api.executeShipmentAction>>>();
    mockedApi.executeShipmentAction.mockReturnValueOnce(transition.promise);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i }));
    const resetButton = screen.getByRole("button", { name: /Действие выполняется/i });
    fireEvent.click(resetButton);

    expect(resetButton).toBeDisabled();
    expect(mockedApi.resetDemo).not.toHaveBeenCalled();
    expect(screen.queryByText("Все изменения в текущих синтетических данных будут сброшены.")).not.toBeInTheDocument();

    transition.resolve({
      transition: {
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      },
      event: shipmentEvent({
        id: "event-3",
        sequence: 3,
        eventType: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      })
    });

    await screen.findByText("Действие выполнено. Состояние и история обновлены.");
  });

  it("resets the demo once, disables controls while pending, and reloads DEMO-001 detail", async () => {
    const reset = deferred<Awaited<ReturnType<typeof api.resetDemo>>>();
    mockedApi.resetDemo.mockReturnValueOnce(reset.promise);
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "reset-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" }),
          shipmentSummary({ id: "reset-3", reference: "DEMO-003", state: "completed" })
        ]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1", {
        shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })
      }))
      .mockResolvedValueOnce(detailFor("reset-1", {
        shipment: shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" })
      }));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Начать демо заново/i }));
    const confirm = screen.getByRole("button", { name: /Сбросить демо/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mockedApi.resetDemo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Сбрасываем демо/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Выполняем/i })).toBeDisabled();

    reset.resolve({ reset: true });

    await screen.findByText("Демо восстановлено в исходное состояние.");
    expect(mockedApi.getShipmentDetail).toHaveBeenLastCalledWith("reset-1");
    const guidedDemo = getGuidedDemoPanel();
    expect(guidedDemo.getByText(/прибытие автомобиля/iu)).toBeInTheDocument();
    expect(within(guidedDemo.getAllByRole("listitem")[0]).getByText("Текущий шаг")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).toBeInTheDocument();
    expect(screen.getByText("Ожидает прибытия на погрузку — текущий этап")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
  });

  it("does not start a workflow transition while demo reset is active", async () => {
    const reset = deferred<Awaited<ReturnType<typeof api.resetDemo>>>();
    mockedApi.resetDemo.mockReturnValueOnce(reset.promise);
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })]
      })
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" })]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockResolvedValueOnce(detailFor("reset-1", {
        shipment: shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" })
      }));

    render(<App />);

    await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i });
    fireEvent.click(screen.getByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));
    fireEvent.click(screen.getByRole("button", { name: /Выполняем/i }));

    expect(mockedApi.executeShipmentAction).not.toHaveBeenCalled();

    reset.resolve({ reset: true });
    await screen.findByText("Демо восстановлено в исходное состояние.");
  });

  it("restores controls and preserves the current UI when demo reset fails", async () => {
    mockedApi.resetDemo.mockRejectedValueOnce(new EtrnFlowApiError("demo_reset_unavailable"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Не удалось сбросить демо-данные. Повторите попытку.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByText("Ожидает прибытия на погрузку").length).toBeGreaterThan(0);
  });

  it("restores controls and preserves valid UI when post-reset refresh fails", async () => {
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockRejectedValueOnce(new EtrnFlowApiError("shipment_list_unavailable"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Не удалось загрузить список перевозок.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-002/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
  });

  it("preserves the previous complete UI snapshot when reset detail refresh fails", async () => {
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" }),
          shipmentSummary({ id: "reset-2", reference: "DEMO-002", state: "in_transit" })
        ]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1", {
        events: [
          shipmentEvent({ id: "event-1", sequence: 1, eventType: "shipment_created" }),
          shipmentEvent({ id: "event-2", sequence: 2, eventType: "dispatch" })
        ]
      }))
      .mockRejectedValueOnce(new EtrnFlowApiError("shipment_detail_unavailable"));

    render(<App />);

    await screen.findByText("Подтвердить прибытие автомобиля");
    fireEvent.click(screen.getByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Не удалось загрузить карточку перевозки.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-002/i })).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: /reset-1/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
    expect(within(getTimelineItems()[0]).getByText("#1")).toBeInTheDocument();
    expect(within(getTimelineItems()[1]).getByText("#2")).toBeInTheDocument();
  });

  it("prevents a stale detail request from overwriting a successful post-reset snapshot", async () => {
    const staleDetail = deferred<Awaited<ReturnType<typeof api.getShipmentDetail>>>();
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" }),
          shipmentSummary({ id: "reset-2", reference: "DEMO-002", state: "in_transit" })
        ]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockReturnValueOnce(staleDetail.promise)
      .mockResolvedValueOnce(detailFor("reset-1", {
        shipment: shipmentSummary({ id: "reset-1", reference: "DEMO-001", state: "awaiting_loading" }),
        events: [
          shipmentEvent({ id: "reset-event-1", sequence: 10, eventType: "shipment_created" }),
          shipmentEvent({ id: "reset-event-2", sequence: 11, eventType: "dispatch" })
        ]
      }));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /DEMO-002/i }));
    fireEvent.click(screen.getByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Демо восстановлено в исходное состояние.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    staleDetail.resolve(detailFor("shipment-2"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    });
    expect(screen.getAllByText("DEMO-001").length).toBeGreaterThan(0);
    expect(screen.queryByText("DEMO-002")).toBeInTheDocument();
    expect(within(getTimelineItems()[0]).getByText("#10")).toBeInTheDocument();
    expect(within(getTimelineItems()[1]).getByText("#11")).toBeInTheDocument();
  });

  it("keeps action controls disabled until the refreshed state and next action are available", async () => {
    const transition = deferred<Awaited<ReturnType<typeof api.executeShipmentAction>>>();
    const refreshedList = deferred<Awaited<ReturnType<typeof api.listShipments>>>();
    const refreshedDetail = deferred<Awaited<ReturnType<typeof api.getShipmentDetail>>>();

    mockedApi.executeShipmentAction.mockReturnValueOnce(transition.promise);
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })]
      })
      .mockReturnValueOnce(refreshedList.promise);
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockReturnValueOnce(refreshedDetail.promise);

    render(<App />);

    const action = await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i });
    fireEvent.click(action);

    expect(action).toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toBeDisabled();

    transition.resolve({
      transition: {
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      },
      event: shipmentEvent({
        id: "event-3",
        sequence: 3,
        eventType: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      })
    });
    refreshedList.resolve({
      shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })]
    });

    await waitFor(() => {
      expect(action).toBeDisabled();
      expect(screen.getByRole("button", { name: /DEMO-001/i })).toBeDisabled();
    });

    refreshedDetail.resolve(detailFor("shipment-1", {
      shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })
    }));

    expect(await screen.findByRole("button", { name: /Завершить погрузку/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
  });

  it("ignores double-submit attempts while a transition is already active", async () => {
    const transition = deferred<Awaited<ReturnType<typeof api.executeShipmentAction>>>();
    mockedApi.executeShipmentAction.mockReturnValueOnce(transition.promise);

    render(<App />);

    const action = await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i });
    fireEvent.click(action);
    fireEvent.click(action);

    expect(mockedApi.executeShipmentAction).toHaveBeenCalledTimes(1);

    transition.resolve({
      transition: {
        shipmentId: "shipment-1",
        action: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      },
      event: shipmentEvent({
        id: "event-3",
        sequence: 3,
        eventType: "markVehicleArrived",
        actorRole: "warehouse",
        previousState: "awaiting_loading",
        nextState: "loading"
      })
    });

    await screen.findByText("Действие выполнено. Состояние и история обновлены.");
    expect(mockedApi.executeShipmentAction).toHaveBeenCalledTimes(1);
  });

  it("keeps shipment selection locked while a transition is pending", async () => {
    const transition = deferred<Awaited<ReturnType<typeof api.executeShipmentAction>>>();
    mockedApi.executeShipmentAction.mockReturnValueOnce(transition.promise);

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    const selectedShipment = screen.getByRole("button", { name: /DEMO-001/i });
    const otherShipment = screen.getByRole("button", { name: /DEMO-002/i });

    expect(selectedShipment).toBeDisabled();
    expect(otherShipment).toBeDisabled();

    fireEvent.click(otherShipment);

    expect(selectedShipment).toHaveAttribute("aria-current", "true");
    expect(otherShipment).not.toHaveAttribute("aria-current");
  });

  it("ignores a stale transition refresh detail that does not match the selected shipment", async () => {
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })]
      })
      .mockResolvedValueOnce({
        shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "loading" })]
      });
    mockedApi.getShipmentDetail
      .mockResolvedValueOnce(detailFor("shipment-1"))
      .mockResolvedValueOnce(detailFor("shipment-2"));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    await screen.findByText("Действие выполнено. Состояние и история обновлены.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText("DEMO-002")).not.toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /Завершить погрузку/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeInTheDocument();
  });

  it("refreshes stale data after an invalid transition and recomputes available actions", async () => {
    mockedApi.executeShipmentAction.mockRejectedValueOnce(new EtrnFlowApiError("invalid_transition"));
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

    await screen.findByText("Это действие больше недоступно для текущего состояния перевозки.");
    expect(screen.getByRole("button", { name: /Завершить погрузку/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeInTheDocument();
  });

  it("exits transitioning and restores controls when conflict recovery refresh fails", async () => {
    mockedApi.executeShipmentAction.mockRejectedValueOnce(new EtrnFlowApiError("transition_conflict"));
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockRejectedValueOnce(new EtrnFlowApiError("shipment_list_unavailable"));
    mockedApi.getShipmentDetail.mockResolvedValueOnce(detailFor("shipment-1"));

    render(<App />);

    const action = await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i });
    fireEvent.click(action);

    await screen.findByText("Не удалось загрузить список перевозок.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-002/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByText("Ожидает прибытия на погрузку").length).toBeGreaterThan(0);
  });

  it("exits transitioning and restores controls when invalid-transition recovery refresh fails", async () => {
    mockedApi.executeShipmentAction.mockRejectedValueOnce(new EtrnFlowApiError("invalid_transition"));
    mockedApi.listShipments
      .mockResolvedValueOnce({
        shipments: [
          shipmentSummary({ id: "shipment-2", reference: "DEMO-002", state: "in_transit" }),
          shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "awaiting_loading" })
        ]
      })
      .mockRejectedValueOnce(new EtrnFlowApiError("shipment_list_unavailable"));
    mockedApi.getShipmentDetail.mockResolvedValueOnce(detailFor("shipment-1"));

    render(<App />);

    const action = await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i });
    fireEvent.click(action);

    await screen.findByText("Не удалось загрузить список перевозок.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-002/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByText("Ожидает прибытия на погрузку").length).toBeGreaterThan(0);
  });

  it("shows a quota error for transitions without refreshing or changing the current snapshot", async () => {
    mockedApi.executeShipmentAction.mockRejectedValueOnce(new EtrnFlowApiError("guest_session_quota_exceeded"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    await screen.findByText("Лимит изменений в этом демо-сеансе исчерпан. Начните новый сеанс позже.");
    expect(mockedApi.listShipments).toHaveBeenCalledTimes(1);
    expect(mockedApi.getShipmentDetail).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(getTimelineItems()).toHaveLength(2);
  });

  it("shows a rate-limit error for transitions and does not retry automatically", async () => {
    mockedApi.executeShipmentAction.mockRejectedValueOnce(new EtrnFlowApiError("guest_session_rate_limited"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    await screen.findByText("Слишком много действий подряд. Подождите немного и повторите попытку.");
    expect(mockedApi.executeShipmentAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
  });

  it("shows reset quota errors without refreshing the workspace", async () => {
    mockedApi.resetDemo.mockRejectedValueOnce(new EtrnFlowApiError("demo_reset_quota_exceeded"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Лимит перезапусков демо в этом сеансе исчерпан.");
    expect(mockedApi.resetDemo).toHaveBeenCalledTimes(1);
    expect(mockedApi.listShipments).toHaveBeenCalledTimes(1);
    expect(mockedApi.getShipmentDetail).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
  });

  it("shows reset general quota and usage-unavailable errors with controls restored", async () => {
    mockedApi.resetDemo
      .mockRejectedValueOnce(new EtrnFlowApiError("guest_session_quota_exceeded"))
      .mockRejectedValueOnce(new EtrnFlowApiError("guest_session_usage_unavailable"));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Начать демо заново/i }));
    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Лимит изменений в этом демо-сеансе исчерпан. Начните новый сеанс позже.");
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Сбросить демо/i }));

    await screen.findByText("Не удалось проверить ограничения демо. Повторите попытку позже.");
    expect(mockedApi.resetDemo).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeDisabled();
  });

  it("ignores a stale transition-conflict refresh detail that does not match the selected shipment", async () => {
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
      .mockResolvedValueOnce(detailFor("shipment-2"));

    render(<App />);

    await screen.findByRole("button", { name: /DEMO-001/i });
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    await screen.findByText("Состояние перевозки уже изменилось. Данные обновлены.");
    expect(screen.getByRole("button", { name: /DEMO-001/i })).toHaveAttribute("aria-current", "true");
    expect(screen.queryByText("DEMO-002")).not.toBeInTheDocument();
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

  it("renders a terminal state without action buttons and with an informative progress state", async () => {
    mockedApi.listShipments.mockResolvedValueOnce({
      shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "completed" })]
    });
    mockedApi.getShipmentDetail.mockResolvedValueOnce(detailFor("shipment-1", {
      shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "completed" })
    }));

    render(<App />);

    await screen.findByText("Перевозка завершена. История событий доступна ниже.");
    expect(screen.getByText("Завершено — текущий этап")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Подтвердить прибытие автомобиля/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Завершить погрузку/i })).not.toBeInTheDocument();
  });

  it("marks the current workflow step in text and updates progress after a transition", async () => {
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

    expect(await screen.findByText("Ожидает прибытия на погрузку — текущий этап")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Подтвердить прибытие автомобиля/i }));

    expect(await screen.findByText("Погрузка — текущий этап")).toBeInTheDocument();
    expect(screen.getByText("Ожидает прибытия на погрузку — пройдено")).toBeInTheDocument();
  });

  it("requires confirmation before executing the draft cancellation action", async () => {
    mockedApi.listShipments.mockResolvedValueOnce({
      shipments: [shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "draft" })]
    });
    mockedApi.getShipmentDetail.mockResolvedValueOnce(detailFor("shipment-1", {
      shipment: shipmentSummary({ id: "shipment-1", reference: "DEMO-001", state: "draft" })
    }));

    render(<App />);

    const cancelAction = await screen.findByRole("button", { name: /Отменить перевозку/i });
    expect(screen.getByRole("button", { name: /Подготовить к отправке/i })).toBeInTheDocument();
    fireEvent.click(cancelAction);

    expect(mockedApi.executeShipmentAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Это изменит только синтетические демо-данные.");

    fireEvent.click(cancelAction);
    expect(mockedApi.executeShipmentAction).toHaveBeenCalledWith("shipment-1", {
      action: "cancel",
      actorRole: "dispatcher"
    });
    await screen.findByText("Действие выполнено. Состояние и история обновлены.");
  });
});

function getTimelineItems() {
  const timelineHeading = screen.getByRole("heading", { name: "События перевозки" });
  const timelineSection = timelineHeading.closest("section");

  if (!timelineSection) {
    throw new Error("Timeline section was not rendered.");
  }

  return within(timelineSection).getAllByRole("listitem");
}

function getGuidedDemoPanel(reference = "DEMO-001") {
  const guidedHeading = screen.getByRole("heading", { name: `Сценарий ${reference}` });
  const guidedSection = guidedHeading.closest("section");

  if (!guidedSection) {
    throw new Error("Guided demo section was not rendered.");
  }

  return within(guidedSection);
}

function getOperationalSnapshot() {
  const snapshotHeading = screen.getByRole("heading", { name: "Текущее состояние демо" });
  const snapshotSection = snapshotHeading.closest("section");

  if (!snapshotSection) {
    throw new Error("Operational snapshot section was not rendered.");
  }

  return within(snapshotSection);
}

function expectSnapshotMetric(snapshot: ReturnType<typeof within>, label: string, value: string) {
  const labelElement = snapshot.getByText(label);
  const metricItem = labelElement.closest(".operational-snapshot-item");

  if (!metricItem) {
    throw new Error(`Operational snapshot metric was not rendered: ${label}`);
  }

  expect(within(metricItem).getByText(value)).toBeInTheDocument();
}

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

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}
