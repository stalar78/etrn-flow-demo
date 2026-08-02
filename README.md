# ETRN Flow

`ETRN Flow` — демонстрационное B2B-веб-приложение StalarVision для показа индивидуального интерфейса управления перевозками и процессами вокруг электронных транспортных накладных.

## Статус

Текущая стадия: `Foundation accepted → Persistence foundation next`.

Технический фундамент принят и объединён в `main` через PR #1. В репозитории уже работают:

- pnpm workspace;
- React + TypeScript + Vite web app;
- Node.js + TypeScript + Fastify API;
- `/health` endpoint;
- shared и domain packages;
- начальная shipment workflow state machine с тестами;
- PostgreSQL Docker Compose для локальной разработки;
- lint, typecheck, tests, build и GitHub Actions CI.

## Что создаём

Публичную адаптивную демоверсию, в которой посетитель сможет:

- войти без регистрации;
- увидеть кабинет диспетчера;
- просмотреть подготовленные рейсы;
- создать демонстрационный рейс;
- провести его через погрузку, перевозку и выгрузку;
- переключаться между ролями диспетчера, водителя, склада, грузополучателя и руководителя;
- увидеть просрочки, замечания и имитацию ошибки интеграции;
- перейти к предложению StalarVision по индивидуальной разработке и внедрению.

## Важное ограничение

Проект не является оператором ИС ЭПД, не взаимодействует с ГИС ЭПД в первой версии, не выполняет юридически значимое подписание и не хранит реальные перевозочные документы.

## Планируемое размещение

- коммерческая страница: отдельный маршрут на `stalarvision.ru`;
- демоверсия: отдельный поддомен, предварительно `etrn-flow.stalarvision.ru`.

## Локальные команды

```bash
make install
make dev
make test
make lint
make typecheck
make build
make check
make db-up
make db-down
```

## Project Brain

- `.business/` — продукт, аудитория, цели, монетизация и ограничения;
- `.idea/` — проблема, гипотеза, MVP, метрики и риски;
- `.architecture/` — архитектурный чертёж;
- `.architect/` — правила управления проектом и работы агентов;
- `.plans/` — планы стадий;
- `.retrospectives/` — ретроспективы завершённых стадий;
- `.security/` — модель угроз, секреты, production-доступ и опасные команды;
- `docs/` — основные постоянные документы.

## Рабочий цикл

```text
Idea → Architecture → Plan → Build → Review → Docs → Commit → Handoff
```

## Ближайший шаг

Следующая контролируемая стадия — persistence foundation:

- подключить Drizzle ORM и PostgreSQL driver;
- описать минимальную schema для guest sessions, shipments и events;
- создать первую migration;
- добавить repository interfaces и PostgreSQL implementations;
- доказать persistence integration tests;
- не переходить пока к guest-session HTTP flow, seed/reset API или продуктовой UI.
