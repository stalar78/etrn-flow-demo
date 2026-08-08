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
  "Прибытие и погрузка",
  "Перевозка",
  "Разгрузка",
  "Завершение"
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
        instruction: "Перевозка началась. Следующий шаг — подтвердить прибытие к разгрузке.",
        steps: buildSteps(1)
      };
    case "awaiting_unloading":
      return {
        instruction: "Автомобиль прибыл к разгрузке. Теперь начните разгрузку.",
        steps: buildSteps(2)
      };
    case "unloading":
      return {
        instruction: "Разгрузка идёт. Завершите разгрузку, чтобы перейти к финальному подтверждению.",
        steps: buildSteps(2)
      };
    case "awaiting_confirmation":
      return {
        instruction: "Разгрузка завершена. Подтвердите завершение синтетической перевозки.",
        steps: buildSteps(3)
      };
    case "completed":
      return {
        instruction: "Сценарий завершён. История событий доступна ниже, демо можно сбросить в исходное состояние.",
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
