import type {
  ActorRole,
  ShipmentSummary,
  ShipmentWorkflowAction
} from "../api/etrn-flow-api";
import { workflowActionsByState } from "../presentation/workflow-labels";

type WorkflowActionsProps = {
  isTransitioning: boolean;
  onExecute(input: { action: ShipmentWorkflowAction; actorRole: ActorRole }): void;
  shipment: ShipmentSummary | null;
};

export function WorkflowActions({
  isTransitioning,
  onExecute,
  shipment
}: WorkflowActionsProps) {
  const actions = shipment ? workflowActionsByState[shipment.state] : [];

  return (
    <section className="panel action-panel" aria-labelledby="workflow-actions-title">
      <div className="panel-heading">
        <p className="section-kicker">Действие</p>
        <h2 id="workflow-actions-title">Следующий шаг</h2>
      </div>

      {!shipment ? (
        <p className="empty-state">Действия появятся после выбора перевозки.</p>
      ) : null}

      {shipment && actions.length === 0 ? (
        <p className="empty-state">Для текущего состояния нет действия в этом демо-срезе.</p>
      ) : null}

      <div className="action-stack">
        {actions.map((option) => (
          <button
            className="primary-action"
            disabled={isTransitioning}
            key={option.action}
            onClick={() => onExecute({
              action: option.action,
              actorRole: option.actorRole
            })}
            type="button"
          >
            <span>{isTransitioning ? "Выполняем..." : option.label}</span>
            <small>Роль: {option.roleLabel}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
