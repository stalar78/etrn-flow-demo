# ETRN Flow

`ETRN Flow` — публичное синтетическое B2B-демо StalarVision, показывающее, как индивидуальная веб-система может объединять рейсы, роли, статусы, действия и историю событий в одном рабочем интерфейсе.

## Статус

Текущая стадия: `Stages 03–15D accepted → Stage 16 controlled deployment next`.

Последний принятый product-code merge в `main`:

`4ae57a70c1c1e0f5ef5455f4208e00a54870ab69`

Stage 15D был evidence-only rehearsal без изменений application code, schema, Docker/Compose или dependencies.

Публичный deployment ещё не выполнялся.

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
- bounded manual cleanup of expired guest sessions and cascaded synthetic data;
- repository-level production dependency audit and full-history Gitleaks scan;
- strict Nginx CSP/security headers with production response assertions;
- locally rehearsed production-like startup, logical PostgreSQL backup/restore and runtime restart persistence.

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

## Public-release hardening

Stage 15C принят и включает:

- `drizzle-orm` `^0.45.2`;
- CI gate `pnpm audit --prod --audit-level high`;
- full-history Gitleaks scan pinned to immutable action SHA;
- reusable `infra/nginx/security-headers.conf`;
- strict CSP without `unsafe-inline`, `unsafe-eval`, wildcards, `data:` or `blob:`;
- security headers retained in locations with their own `add_header` directives;
- production response-header smoke for `/`, `/index.html`, built asset, `/health` and `/api/session`.

Latest accepted Stage 15C PR CI: run #59, successful.

## Release rehearsal

Stage 15D был выполнен локально как evidence-only stage без изменений репозитория.

Подтверждено:

- production Compose config валиден;
- production images собираются;
- migrations проходят на чистой synthetic PostgreSQL DB;
- `postgres`, `api`, `web` становятся healthy;
- same-origin `/health`, session/bootstrap/list API работают через production web/Nginx boundary;
- Secure guest-session cookie и Stage 15C response headers присутствуют;
- `pg_dump -Fc` создаёт logical backup;
- `pg_restore` в отдельную synthetic DB восстановил guest session, 3 shipments, 14 shipment events, usage-limit state и Drizzle migration metadata;
- restart `api` и `web` сохранил PostgreSQL state;
- rehearsal artifacts и temporary volume после проверки удалены.

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

Репозиторий и container baseline проверены локально и в CI. VPS, DNS, TLS, host Nginx и firewall для ETRN Flow ещё не настраивались.

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

Следующий контролируемый этап — Stage 16: controlled deployment.

В отдельном deployment gate должны быть приняты и проверены:

- production secrets вне Git;
- VPS placement;
- host Nginx reverse proxy;
- TLS/Certbot и HSTS decision;
- firewall;
- external backup storage и retention;
- production restore procedure;
- external health/smoke;
- rollback boundary.

Deployment не начинается неявно из repository-only задачи и требует отдельного контролируемого этапа.
