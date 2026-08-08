import type { ShipmentSummary } from "../api/etrn-flow-api";

type OperationalSnapshotProps = {
  shipments: ShipmentSummary[];
};

export function OperationalSnapshot({ shipments }: OperationalSnapshotProps) {
  const attentionRequiredCount = shipments.filter((shipment) => shipment.state === "attention_required").length;
  const completedCount = shipments.filter((shipment) => shipment.state === "completed").length;

  const metrics = [
    { label: "Всего перевозок", value: shipments.length },
    { label: "Требуют внимания", value: attentionRequiredCount },
    { label: "Завершены", value: completedCount }
  ];

  return (
    <section className="panel operational-snapshot" aria-labelledby="operational-snapshot-title">
      <div className="panel-heading operational-snapshot-heading">
        <p className="section-kicker">Сводка</p>
        <h2 id="operational-snapshot-title">Текущее состояние демо</h2>
        <p className="operational-snapshot-description">
          Сводка обновляется вместе с перевозками и показывает общую картину текущего демо-сеанса.
        </p>
      </div>
      <dl className="operational-snapshot-grid">
        {metrics.map((metric) => (
          <div className="operational-snapshot-item" key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
