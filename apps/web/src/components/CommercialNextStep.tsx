const CTA_URL = "https://stalarvision.ru";

const discussionItems = [
  {
    title: "Рабочий процесс",
    text: "Этапы, статусы, роли, разрешённые действия и исключения можно разобрать до проектирования интерфейса."
  },
  {
    title: "Данные и существующие системы",
    text: "Можно определить, какие данные нужны пользователям, откуда они приходят и какие системы потенциально участвуют."
  },
  {
    title: "Интерфейс для пользователей",
    text: "Можно обсудить, что должно быть видно на каждом этапе и какие действия доступны конкретной роли."
  }
];

export function CommercialNextStep() {
  return (
    <section className="commercial-next-step" aria-labelledby="commercial-next-step-title">
      <div className="commercial-next-step-copy">
        <p className="eyebrow">Следующий шаг</p>
        <h2 id="commercial-next-step-title">Если похожий процесс есть в вашей компании</h2>
        <p>
          ETRN Flow — синтетическое демо архитектурного подхода. Реальная система проектируется под конкретные
          роли, этапы, данные и ограничения организации.
        </p>
      </div>

      <ul className="commercial-next-step-list" aria-label="Что можно обсудить">
        {discussionItems.map((item) => (
          <li key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>

      <a className="primary-link commercial-next-step-cta" href={CTA_URL} target="_blank" rel="noreferrer">
        Обсудить свою задачу
      </a>
    </section>
  );
}
