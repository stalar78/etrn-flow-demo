import { useCallback, useEffect, useRef, useState } from "react";

import {
  bootstrapDemo,
  EtrnFlowApiError,
  executeShipmentAction,
  getHealth,
  getSession,
  getShipmentDetail,
  listShipments,
  type ActorRole,
  type ShipmentDetailResponse,
  type ShipmentSummary,
  type ShipmentWorkflowAction
} from "./api/etrn-flow-api";
import { AppHeader } from "./components/AppHeader";
import { EventTimeline } from "./components/EventTimeline";
import { Notice } from "./components/Notice";
import { ShipmentDetail } from "./components/ShipmentDetail";
import { ShipmentList } from "./components/ShipmentList";
import { WorkflowActions } from "./components/WorkflowActions";
import { apiErrorMessages } from "./presentation/workflow-labels";

type WorkspacePhase =
  | "initializing"
  | "bootstrapping"
  | "ready"
  | "transitioning"
  | "recoverable_error"
  | "fatal_initialization_error";

type ApiStatus = "checking" | "connected" | "offline";

export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [detail, setDetail] = useState<ShipmentDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [phase, setPhase] = useState<WorkspacePhase>("initializing");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<ShipmentSummary[]>([]);
  const detailRequestRef = useRef(0);
  const selectedShipmentIdRef = useRef<string | null>(null);

  const setSelectedShipment = useCallback((shipmentId: string | null) => {
    selectedShipmentIdRef.current = shipmentId;
    setSelectedShipmentId(shipmentId);
  }, []);

  const loadDetail = useCallback(async (shipmentId: string) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    setDetailLoading(true);

    try {
      const nextDetail = await getShipmentDetail(shipmentId);

      if (
        detailRequestRef.current === requestId
        && selectedShipmentIdRef.current === nextDetail.shipment.id
        && shipmentId === nextDetail.shipment.id
      ) {
        setDetail(nextDetail);
      }
    } catch (error) {
      if (isAbortError(error) || detailRequestRef.current !== requestId) {
        return;
      }

      setPhase("recoverable_error");
      setMessage({
        tone: "error",
        text: toRussianErrorMessage(error)
      });
    } finally {
      if (detailRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  }, []);

  const initializeWorkspace = useCallback(async () => {
    setApiStatus("checking");
    setMessage(null);
    setPhase("initializing");
    setDetail(null);
    setShipments([]);
    setSelectedShipment(null);

    try {
      await getHealth();
      setApiStatus("connected");
      await getSession();
      setPhase("bootstrapping");
      await bootstrapDemo();
      const shipmentResponse = await listShipments();
      const defaultShipment = pickDefaultShipment(shipmentResponse.shipments);

      setShipments(shipmentResponse.shipments);
      setSelectedShipment(defaultShipment?.id ?? null);

      if (defaultShipment) {
        await loadDetail(defaultShipment.id);
      }

      setPhase("ready");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setApiStatus("offline");
      setPhase("fatal_initialization_error");
      setMessage({
        tone: "error",
        text: toRussianErrorMessage(error)
      });
    }
  }, [loadDetail, setSelectedShipment]);

  useEffect(() => {
    void initializeWorkspace();
  }, [initializeWorkspace]);

  async function refreshWorkspace(shipmentId: string) {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    const [shipmentResponse, nextDetail] = await Promise.all([
      listShipments(),
      getShipmentDetail(shipmentId)
    ]);

    setShipments(shipmentResponse.shipments);

    if (
      detailRequestRef.current === requestId
      && selectedShipmentIdRef.current === nextDetail.shipment.id
      && shipmentId === nextDetail.shipment.id
    ) {
      setDetail(nextDetail);
    }
  }

  async function handleSelectShipment(shipmentId: string) {
    if (phase === "initializing" || phase === "bootstrapping" || phase === "transitioning") {
      return;
    }

    setSelectedShipment(shipmentId);
    setMessage(null);
    await loadDetail(shipmentId);
    setPhase("ready");
  }

  async function handleExecuteAction(input: {
    action: ShipmentWorkflowAction;
    actorRole: ActorRole;
  }) {
    if (!selectedShipmentId) {
      return;
    }

    const transitionShipmentId = selectedShipmentId;

    setPhase("transitioning");
    setMessage(null);

    try {
      await executeShipmentAction(transitionShipmentId, input);
      await refreshWorkspace(transitionShipmentId);
      setPhase("ready");
      setMessage({
        tone: "success",
        text: "Действие выполнено. Состояние и история обновлены."
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      if (error instanceof EtrnFlowApiError && error.code === "transition_conflict") {
        await refreshWorkspace(transitionShipmentId);
      }

      setPhase("recoverable_error");
      setMessage({
        tone: "error",
        text: toRussianErrorMessage(error)
      });
    }
  }

  const currentDetail = detail?.shipment.id === selectedShipmentId ? detail : null;
  const selectedSummary = currentDetail?.shipment
    ?? shipments.find((shipment) => shipment.id === selectedShipmentId)
    ?? null;
  const isListInteractionDisabled = phase === "initializing"
    || phase === "bootstrapping"
    || phase === "transitioning";

  return (
    <div className="workspace-shell">
      <AppHeader apiStatus={apiStatus} />

      <main className="workspace-main" aria-busy={phase === "initializing" || phase === "bootstrapping"}>
        {phase === "initializing" ? (
          <Notice>Подключаемся к API и готовим демо-сеанс...</Notice>
        ) : null}

        {phase === "bootstrapping" ? (
          <Notice>Создаем синтетический демо-набор перевозок...</Notice>
        ) : null}

        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

        {phase === "fatal_initialization_error" ? (
          <section className="panel fatal-panel" aria-labelledby="fatal-title">
            <h2 id="fatal-title">Демо не загрузилось</h2>
            <p>Можно повторить инициализацию. Идентификаторы сеанса в интерфейсе не отображаются.</p>
            <button className="secondary-action" onClick={() => void initializeWorkspace()} type="button">
              Повторить
            </button>
          </section>
        ) : null}

        {phase !== "fatal_initialization_error" ? (
          <div className="workspace-grid">
            <ShipmentList
              isInteractionDisabled={isListInteractionDisabled}
              isLoading={phase === "initializing" || phase === "bootstrapping"}
              onSelect={(shipmentId) => void handleSelectShipment(shipmentId)}
              selectedShipmentId={selectedShipmentId}
              shipments={shipments}
            />

            <div className="detail-column">
              <ShipmentDetail isLoading={detailLoading} shipment={selectedSummary} />
              <WorkflowActions
                isTransitioning={phase === "transitioning"}
                onExecute={(input) => void handleExecuteAction(input)}
                shipment={selectedSummary}
              />
              <EventTimeline events={currentDetail?.events ?? []} isLoading={detailLoading} />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function pickDefaultShipment(shipments: ShipmentSummary[]) {
  return shipments.find((shipment) => shipment.reference === "DEMO-001") ?? shipments[0] ?? null;
}

function toRussianErrorMessage(error: unknown) {
  if (error instanceof EtrnFlowApiError) {
    return apiErrorMessages[error.code] ?? apiErrorMessages.request_failed;
  }

  return apiErrorMessages.request_failed;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
