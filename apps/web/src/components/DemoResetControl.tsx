type DemoResetControlProps = {
  isConfirming: boolean;
  isInteractionDisabled: boolean;
  pendingLabel: string;
  onCancel(): void;
  onConfirm(): void;
  onRequestConfirmation(): void;
};

export function DemoResetControl({
  isConfirming,
  isInteractionDisabled,
  onCancel,
  onConfirm,
  onRequestConfirmation,
  pendingLabel
}: DemoResetControlProps) {
  return (
    <section className="panel reset-panel" aria-labelledby="demo-reset-title">
      <div className="panel-heading">
        <p className="section-kicker">Демо-сеанс</p>
        <h2 id="demo-reset-title">Повтор сценария</h2>
      </div>

      <div className="reset-controls" aria-live="polite">
        {!isConfirming ? (
          <button
            className="secondary-action"
            disabled={isInteractionDisabled}
            onClick={onRequestConfirmation}
            type="button"
          >
            {isInteractionDisabled ? pendingLabel : "Начать демо заново"}
          </button>
        ) : (
          <div className="confirmation-note" role="alert">
            <p>Все изменения в текущих синтетических данных будут сброшены.</p>
            <div className="confirmation-actions">
              <button
                className="danger-action"
                disabled={isInteractionDisabled}
                onClick={onConfirm}
                type="button"
              >
                {isInteractionDisabled ? pendingLabel : "Сбросить демо"}
              </button>
              <button
                className="secondary-action"
                disabled={isInteractionDisabled}
                onClick={onCancel}
                type="button"
              >
                Не сбрасывать
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
