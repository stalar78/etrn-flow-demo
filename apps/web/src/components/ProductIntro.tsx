const capabilityItems = [
  "Последовательный процесс от погрузки до завершения",
  "Роли и управляемое отклонение с возвратом в процесс",
  "История событий после каждого изменения"
];

export function ProductIntro() {
  return (
    <section className="product-intro" aria-labelledby="product-intro-title">
      <div className="product-intro-copy">
        <p className="eyebrow">ETRN Flow · интерактивное демо</p>
        <h1 id="product-intro-title">Демо системы для управления этапами перевозки</h1>
        <p className="product-intro-lead">
          Показываю, как индивидуальная веб-система может связывать рейсы, роли, статусы, действия и историю
          событий в одном рабочем интерфейсе. В демо можно пройти основной путь перевозки, посмотреть обработку
          отклонения и увидеть, как сохраняется история каждого изменения.
        </p>
        <ul className="capability-list">
          {capabilityItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="developer-positioning">
          Проектирование, frontend, backend и подготовка к запуску выполняются одним независимым разработчиком
          StalarVision.
        </p>
      </div>

      <div className="product-intro-aside">
        <section className="demo-guide" aria-labelledby="demo-guide-title">
          <h2 className="demo-guide-title" id="demo-guide-title">Как посмотреть демо</h2>
          <ol className="demo-guide-list">
            <li className="demo-guide-step">
              <strong>Начните с DEMO-001</strong>
              <span className="demo-guide-step-copy">Пройдите основной путь перевозки от погрузки до завершения.</span>
            </li>
            <li className="demo-guide-step">
              <strong>Следуйте доступному действию</strong>
              <span className="demo-guide-step-copy">Интерфейс показывает следующий допустимый шаг и роль, от которой он выполняется.</span>
            </li>
            <li className="demo-guide-step">
              <strong>Посмотрите, что изменилось</strong>
              <span className="demo-guide-step-copy">После действия обновляются состояние перевозки, сводка и история событий.</span>
            </li>
          </ol>
          <p className="demo-guide-secondary">
            DEMO-002 показывает обработку отклонения и возврат в обычный процесс, а DEMO-003 — завершённый пример.
          </p>
        </section>
        <p className="product-disclaimer">
          Демо работает только с синтетическими данными. Здесь нет реальных компаний, документов, подписей,
          юридически значимых операций, передачи в ГИС ЭПД или подключения к оператору ИС ЭПД.
        </p>
        <details className="demo-disclosure">
          <summary>О возможностях демо</summary>
          <p>
            Демо показывает изолированную guest-сессию, workflow с подтверждением на сервере, действия с учётом
            ролей, историю событий, управляемое отклонение с возвратом в процесс и сброс к исходному набору.
            Реальные интеграции, документы и юридически значимые операции проектируются отдельно под конкретную
            задачу.
          </p>
        </details>
      </div>
    </section>
  );
}
