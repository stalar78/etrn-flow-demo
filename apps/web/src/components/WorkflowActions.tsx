import type {
  ActorRole,
  ShipmentSummary,
  ShipmentWorkflowAction
} from "../api/etrn-flow-api";
import { noActionMessages, workflowActionsByState } from "../presentation/workflow-labels";

type WorkflowActionsProps = {
  confirmationAction: ShipmentWorkflowAction | null;
  isTransitioning: boolean;
  onExecute(input: { action: ShipmentWorkflowAction; actorRole: ActorRole }): void;
  onRequestConfirmation(action: ShipmentWorkflowAction | null): void;
  shipment: ShipmentSummary | null;
};

export function WorkflowActions({
  confirmationAction,
  isTransitioning,
  onExecute,
  onRequestConfirmation,
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
        <p className="empty-state">{noActionMessages[shipment.state]}</p>
      ) : null}

      <div className="action-stack" aria-live="polite">
        {actions.map((option) => (
          <div className={`action-card action-card-${option.tone ?? "primary"}`} key={option.action}>
            <button
              className={option.tone === "danger" ? "danger-action" : "primary-action"}
              disabled={isTransitioning}
              onClick={() => {
                if (option.tone === "danger" && confirmationAction !== option.action) {
                  onRequestConfirmation(option.action);
                  return;
                }

                onRequestConfirmation(null);
                onExecute({
                  action: option.action,
                  actorRole: option.actorRole
                });
              }}
              type="button"
            >
              <span>{isTransitioning ? "Выполняем..." : option.label}</span>
              <small>Роль: {option.roleLabel}</small>
            </button>
            {option.description ? <p className="action-description">{option.description}</p> : null}
            {option.tone === "danger" && confirmationAction === option.action ? (
              <div className="confirmation-note" role="alert">
                <p>Это изменит только синтетические демо-данные.</p>
                <button
                  className="secondary-action"
                  disabled={isTransitioning}
                  onClick={() => onRequestConfirmation(null)}
                  type="button"
                >
                  Не отменять
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
