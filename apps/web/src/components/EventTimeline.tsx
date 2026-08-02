import type { ShipmentEvent } from "../api/etrn-flow-api";
import {
  actorRoleLabels,
  eventTypeLabels,
  formatDateTime,
  shipmentStateLabels
} from "../presentation/workflow-labels";

type EventTimelineProps = {
  events: ShipmentEvent[];
  isLoading: boolean;
};

export function EventTimeline({ events, isLoading }: EventTimelineProps) {
  const sortedEvents = [...events].sort((left, right) => left.sequence - right.sequence);

  return (
    <section className="panel timeline-panel" aria-labelledby="event-timeline-title">
      <div className="panel-heading">
        <p className="section-kicker">История</p>
        <h2 id="event-timeline-title">События перевозки</h2>
      </div>

      {isLoading ? (
        <p className="muted" aria-live="polite">Обновляем историю событий...</p>
      ) : null}

      {sortedEvents.length === 0 && !isLoading ? (
        <p className="empty-state">События появятся после выбора перевозки.</p>
      ) : null}

      <ol className="timeline">
        {sortedEvents.map((event) => (
          <li className="timeline-item" key={event.id}>
            <div className="sequence">#{event.sequence}</div>
            <div>
              <h3>{eventTypeLabels[event.eventType] ?? "Событие workflow"}</h3>
              <p>
                {shipmentStateLabels[event.previousState]} {"->"} {shipmentStateLabels[event.nextState]}
              </p>
              <p className="muted">
                Роль: {actorRoleLabels[event.actorRole]} · {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
