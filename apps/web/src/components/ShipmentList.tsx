import type { ShipmentSummary } from "../api/etrn-flow-api";
import { formatDateTime, shipmentStateLabels } from "../presentation/workflow-labels";

type ShipmentListProps = {
  isInteractionDisabled: boolean;
  isLoading: boolean;
  onSelect(shipmentId: string): void;
  selectedShipmentId: string | null;
  shipments: ShipmentSummary[];
};

const preparedScenarioDescriptors: Partial<Record<string, string>> = {
  "DEMO-001": "Основной путь перевозки",
  "DEMO-002": "Отклонение и восстановление",
  "DEMO-003": "Завершённый пример"
};

export function ShipmentList({
  isInteractionDisabled,
  isLoading,
  onSelect,
  selectedShipmentId,
  shipments
}: ShipmentListProps) {
  return (
    <section className="panel shipment-list-panel" aria-labelledby="shipment-list-title">
      <div className="panel-heading">
        <p className="section-kicker">Перевозки</p>
        <h2 id="shipment-list-title">Демо-набор</h2>
      </div>

      {isLoading ? (
        <p className="muted" aria-live="polite">Обновляем список перевозок...</p>
      ) : null}

      {shipments.length === 0 && !isLoading ? (
        <p className="empty-state">В демо-сеансе пока нет перевозок.</p>
      ) : null}

      <div className="shipment-list" role="list">
        {shipments.map((shipment) => {
          const isSelected = shipment.id === selectedShipmentId;
          const descriptor = preparedScenarioDescriptors[shipment.reference];

          return (
            <button
              aria-current={isSelected ? "true" : undefined}
              className="shipment-list-item"
              disabled={isInteractionDisabled}
              key={shipment.id}
              onClick={() => onSelect(shipment.id)}
              type="button"
            >
              <span className="shipment-reference">{shipment.reference}</span>
              {descriptor ? <span className="shipment-descriptor">{descriptor}</span> : null}
              <span className={`state-badge state-${shipment.state}`}>
                {shipmentStateLabels[shipment.state]}
              </span>
              <span className="timestamp">Обновлено: {formatDateTime(shipment.updatedAt)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
