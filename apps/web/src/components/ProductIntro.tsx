const CTA_URL = "https://stalarvision.ru";

const capabilityItems = [
  "Статусы и действия в одном процессе",
  "Роли участников в общем сценарии",
  "История событий после каждого шага"
];

export function ProductIntro() {
  return (
    <section className="product-intro" aria-labelledby="product-intro-title">
      <div className="product-intro-copy">
        <p className="eyebrow">ETRN Flow · интерактивное демо</p>
        <h1 id="product-intro-title">Демо системы для управления этапами перевозки</h1>
        <p className="product-intro-lead">
          Показываю, как индивидуальная веб-система может связывать рейсы, роли, статусы, действия и историю
          событий в одном рабочем интерфейсе. Такой подход можно адаптировать под реальные процессы компании.
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
        <p className="demo-instruction">
          Начните с DEMO-001: подтвердите прибытие автомобиля, затем завершите погрузку и посмотрите, как
          обновятся статус, этапы и история событий.
        </p>
        <p className="product-disclaimer">
          Демо работает только с синтетическими данными. Здесь нет реальных компаний, документов, подписей,
          юридически значимых операций, передачи в ГИС ЭПД или подключения к оператору ИС ЭПД.
        </p>
        <div className="intro-actions">
          <a className="primary-link" href={CTA_URL} target="_blank" rel="noreferrer">
            Обсудить похожую систему
          </a>
        </div>
        <details className="demo-disclosure">
          <summary>О возможностях демо</summary>
          <p>
            Демо показывает работу изолированной guest-сессии, серверно подтверждённых workflow-действий, истории
            событий и безопасного возврата к исходному сценарию. Реальные интеграции, документы и юридически
            значимые операции проектируются отдельно под задачу клиента.
          </p>
        </details>
      </div>
    </section>
  );
}
