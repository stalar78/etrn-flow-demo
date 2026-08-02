import type { ShipmentSummary } from "../api/etrn-flow-api";
import { formatDateTime, shipmentStateLabels } from "../presentation/workflow-labels";

type ShipmentDetailProps = {
  isLoading: boolean;
  shipment: ShipmentSummary | null;
};

export function ShipmentDetail({ isLoading, shipment }: ShipmentDetailProps) {
  return (
    <section className="panel detail-panel" aria-labelledby="shipment-detail-title">
      <div className="panel-heading">
        <p className="section-kicker">Карточка</p>
        <h2 id="shipment-detail-title">Текущая перевозка</h2>
      </div>

      {isLoading ? (
        <p className="muted" aria-live="polite">Загружаем карточку перевозки...</p>
      ) : null}

      {!shipment && !isLoading ? (
        <p className="empty-state">Выберите перевозку из списка.</p>
      ) : null}

      {shipment ? (
        <dl className="detail-grid">
          <div>
            <dt>Номер</dt>
            <dd>{shipment.reference}</dd>
          </div>
          <div>
            <dt>Состояние</dt>
            <dd>
              <span className={`state-badge state-${shipment.state}`}>
                {shipmentStateLabels[shipment.state]}
              </span>
            </dd>
          </div>
          <div>
            <dt>Создано</dt>
            <dd>{formatDateTime(shipment.createdAt)}</dd>
          </div>
          <div>
            <dt>Обновлено</dt>
            <dd>{formatDateTime(shipment.updatedAt)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
