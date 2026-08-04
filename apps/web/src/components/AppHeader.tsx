type AppHeaderProps = {
  apiStatus: "checking" | "connected" | "offline";
};

export function AppHeader({ apiStatus }: AppHeaderProps) {
  const statusText = {
    checking: "Проверяем API",
    connected: "API подключен",
    offline: "API недоступен"
  }[apiStatus];

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">ETRN Flow</p>
        <p className="header-title">Демонстрационный рабочий интерфейс</p>
        <p className="subtitle">Гостевой сценарий перевозки, статусы, действия и история событий.</p>
      </div>
      <div className="header-meta">
        <p className="disclaimer">
          Демонстрационный интерфейс. Используются только синтетические данные.
        </p>
        <span className={`connection connection-${apiStatus}`} aria-live="polite">
          {statusText}
        </span>
      </div>
    </header>
  );
}
