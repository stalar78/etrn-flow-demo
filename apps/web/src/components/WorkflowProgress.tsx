import type { ShipmentState } from "../api/etrn-flow-api";
import {
  branchStateLabels,
  happyPathStates,
  shipmentStateLabels
} from "../presentation/workflow-labels";

type WorkflowProgressProps = {
  state: ShipmentState | null;
};

export function WorkflowProgress({ state }: WorkflowProgressProps) {
  const currentIndex = state ? happyPathStates.indexOf(state) : -1;
  const branchLabel = state ? branchStateLabels[state] : undefined;

  return (
    <section className="panel progress-panel" aria-labelledby="workflow-progress-title">
      <div className="panel-heading">
        <p className="section-kicker">Процесс</p>
        <h2 id="workflow-progress-title">Ход демо-перевозки</h2>
      </div>

      {!state ? (
        <p className="empty-state">Прогресс появится после выбора перевозки.</p>
      ) : null}

      {state && currentIndex >= 0 ? (
        <ol className="progress-steps">
          {happyPathStates.map((stepState, index) => {
            const status = index < currentIndex
              ? "completed"
              : index === currentIndex
                ? "current"
                : "upcoming";

            return (
              <li className={`progress-step progress-step-${status}`} key={stepState}>
                <span className="progress-marker" aria-hidden="true" />
                <span>
                  {shipmentStateLabels[stepState]}
                  {status === "current" ? " — текущий этап" : null}
                  {status === "completed" ? " — пройдено" : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {state && currentIndex < 0 ? (
        <p className="empty-state">
          {branchLabel ? `${branchLabel}: ` : null}
          {shipmentStateLabels[state]} — состояние вне основной демонстрационной цепочки.
        </p>
      ) : null}
    </section>
  );
}
