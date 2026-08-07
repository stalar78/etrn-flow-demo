# ETRN Flow

`ETRN Flow` — публичное синтетическое B2B-демо StalarVision, показывающее, как индивидуальная веб-система может объединять рейсы, роли, статусы, действия и историю событий в одном рабочем интерфейсе.

## Статус

Текущая стадия: `Stages 03–15B accepted → Public-release security/privacy hardening next`.

Последний принятый commit в `main`:

`b4868f17563b256b4ca1973f11390f02ac46a942`

Последний принятый GitHub CI для Stage 15B: run #54, успешный.

Публичный deployment ещё не выполнялся. Разработка продолжается локально.

## Что уже реализовано

- pnpm workspace;
- React + TypeScript + Vite web app;
- Node.js + TypeScript + Fastify API;
- PostgreSQL + Drizzle ORM;
- backend-issued guest sessions;
- session-scoped synthetic shipments and events;
- deterministic bootstrap with `DEMO-001`, `DEMO-002`, `DEMO-003`;
- named workflow actions with role/state validation;
- transactional state change plus append-only event;
- controlled reset/restart of the current guest demo;
- PostgreSQL-backed mutation/reset quotas and burst limiting;
- frontend stale-request and recovery protection;
- one Chromium E2E happy path including reset;
- production API/web images and production Compose baseline;
- same-origin Nginx proxy inside the web container;
- CI production-stack build, migration, health, smoke and port-exposure checks;
- compact product intro, independent-developer positioning and CTA to StalarVision;
- bounded manual cleanup of expired guest sessions and cascaded synthetic data.

## Lifecycle cleanup

Stage 15B добавил ручную maintenance-команду:

```bash
corepack pnpm db:cleanup-expired-sessions
```

Принятая политика:

- удаляются только guest sessions, истёкшие более 24 часов назад;
- cutoff вычисляется временем PostgreSQL;
- batch size — 500;
- максимум 100 batches за один запуск;
- удаление идёт oldest-first;
- параллельные cleanup безопасно координируются через `FOR UPDATE SKIP LOCKED`;
- `shipments`, `shipment_events` и `guest_session_usage_limits` удаляются существующими `ON DELETE CASCADE`;
- scheduler, HTTP cleanup endpoint и request-driven cleanup не добавлены.

## Основной демо-сценарий

Посетитель может:

1. открыть демо без регистрации;
2. выбрать `DEMO-001`;
3. подтвердить прибытие автомобиля;
4. завершить погрузку;
5. увидеть обновление статуса, этапов и истории событий;
6. вернуть демо в исходное состояние.

## Важное ограничение

Проект:

- не является аккредитованным оператором ИС ЭПД;
- не подключён к ГИС ЭПД;
- не выполняет юридически значимое подписание;
- не хранит реальные перевозочные документы или персональные данные;
- не является production TMS или рабочим пространством реального клиента.

Используются только синтетические данные.

## Production baseline

Принятая контейнерная топология:

```text
host Nginx + Certbot
→ 127.0.0.1:8082
→ web container / Nginx
→ api container
→ postgres container
```

Это только локально и в CI проверенный production container baseline. VPS, DNS, TLS, host Nginx и firewall ещё не настраивались для ETRN Flow.

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

Дополнительные проверки workspace выполняются через `corepack pnpm` scripts, определённые в корневом `package.json`.

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

Следующий контролируемый этап — public-release security/privacy hardening перед release rehearsal.

Фокус следующего этапа:

- dependency и secret scanning;
- проверка production headers/CSP boundary;
- privacy/cookie boundary без выдуманных юридических утверждений;
- public-release security checklist;
- определение того, какие вопросы относятся к host/deployment stage и не должны внедряться локально преждевременно.

Deployment не начинается без отдельного этапа и явного решения владельца.
