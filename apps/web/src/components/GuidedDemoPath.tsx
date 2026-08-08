import type { ShipmentState, ShipmentSummary } from "../api/etrn-flow-api";

type DemoStepStatus = "completed" | "current" | "upcoming";

type DemoStep = {
  label: string;
  status: DemoStepStatus;
};

type GuidedDemoState = {
  instruction: string;
  steps: DemoStep[];
};

const demoStepLabels = [
  "Автомобиль прибыл",
  "Погрузка завершена",
  "Перевозка началась"
] as const;

const statusLabels: Record<DemoStepStatus, string> = {
  completed: "Пройдено",
  current: "Текущий шаг",
  upcoming: "Ещё не выполнено"
};

type GuidedDemoPathProps = {
  shipment: ShipmentSummary | null;
};

export function GuidedDemoPath({ shipment }: GuidedDemoPathProps) {
  if (!shipment) {
    return (
      <section className="panel guided-demo-panel" aria-labelledby="guided-demo-title">
        <div className="panel-heading">
          <p className="section-kicker">Подсказка</p>
          <h2 id="guided-demo-title">Сценарий DEMO-001</h2>
        </div>
        <p className="guided-demo-instruction">Подсказка появится после выбора перевозки.</p>
      </section>
    );
  }

  if (shipment.reference !== "DEMO-001") {
    return (
      <section className="panel guided-demo-panel" aria-labelledby="guided-demo-title">
        <div className="panel-heading">
          <p className="section-kicker">Подсказка</p>
          <h2 id="guided-demo-title">Сценарий DEMO-001</h2>
        </div>
        <p className="guided-demo-instruction">Вы просматриваете подготовленный пример другого этапа перевозки.</p>
      </section>
    );
  }

  const guidedState = getGuidedDemoState(shipment.state);

  return (
    <section className="panel guided-demo-panel" aria-labelledby="guided-demo-title">
      <div className="panel-heading">
        <p className="section-kicker">Подсказка</p>
        <h2 id="guided-demo-title">Сценарий DEMO-001</h2>
      </div>
      <p className="guided-demo-instruction">{guidedState.instruction}</p>
      <ol className="guided-demo-steps" aria-label="Шаги основного демо-сценария">
        {guidedState.steps.map((step, index) => (
          <li
            aria-current={step.status === "current" ? "step" : undefined}
            className={`guided-demo-step guided-demo-step-${step.status}`}
            key={step.label}
          >
            <span className="guided-demo-step-number">{index + 1}</span>
            <span className="guided-demo-step-copy">
              <span>{step.label}</span>
              <span className="guided-demo-status">{statusLabels[step.status]}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function getGuidedDemoState(state: ShipmentState): GuidedDemoState {
  switch (state) {
    case "awaiting_loading":
      return {
        instruction: "Подтвердите прибытие автомобиля, чтобы начать сценарий.",
        steps: buildSteps(0)
      };
    case "loading":
      return {
        instruction: "Автомобиль прибыл. Теперь завершите погрузку.",
        steps: buildSteps(1)
      };
    case "in_transit":
      return {
        instruction: "Основной сценарий пройден: перевозка началась. Посмотрите историю событий или сбросьте демо.",
        steps: demoStepLabels.map((label) => ({ label, status: "completed" }))
      };
    default:
      return {
        instruction: "Основной сценарий DEMO-001 начинается со статуса ожидания погрузки.",
        steps: demoStepLabels.map((label) => ({ label, status: "upcoming" }))
      };
  }
}

function buildSteps(currentIndex: number): DemoStep[] {
  return demoStepLabels.map((label, index) => {
    if (index < currentIndex) {
      return { label, status: "completed" };
    }

    if (index === currentIndex) {
      return { label, status: "current" };
    }

    return { label, status: "upcoming" };
  });
}
