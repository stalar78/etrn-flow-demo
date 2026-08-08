# ETRN Flow

`ETRN Flow` — публичное синтетическое B2B-демо StalarVision, показывающее, как индивидуальная веб-система может объединять рейсы, роли, статусы, действия и историю событий в одном рабочем интерфейсе.

## Статус

Текущая стадия: `Stages 03–15D accepted → Stage 16A–16C accepted → Stage 16 Initial Production Launch accepted → Stage 17A Guided Demo Experience accepted → Stage 17B Complete Transport Lifecycle accepted → Stage 17C Managed Attention Scenario accepted → Stage 17D Commercial Conversion Layer accepted → controlled production release accepted`.

Последний принятый product-code merge в `main`:

`2bc824144674d885a6619f8ec7e596b74e81ffd3` (Stage 17D)

Текущий repository/production checkout baseline:

`90a8f81867f6bf1c0d6190ee91176e7b81793d25` (`feat: add favicon (#32)`)

Stage 17A добавил компактный guided layer для основного `DEMO-001` сценария без отдельного client state. Stage 17B завершил server-authoritative happy path до `completed`, добавив разгрузку и финальное подтверждение через существующие role/state guards, transactional update и append-only event. Stage 17C добавил управляемый branch/recovery для `DEMO-002`: `in_transit → attention_required → in_transit` через роли `driver` и `manager`, после чего перевозка снова может продолжить обычный lifecycle. Stage 17D добавил компактный commercial next step после workspace и перенёс единственный основной CTA вниз страницы.

Stage 16C + Stage 17A–17D прошли отдельный controlled production release gate и external smoke 8 августа 2026 года. В production подтверждены guided/full lifecycle, controlled attention/recovery, commercial conversion layer, burst limit `8`, внешний `/health` и точная web-публикация только на `127.0.0.1:8083`. Последующий UI update добавил фирменный favicon; PR #32 подтверждён CI #91 и развернут отдельной пересборкой только web-контейнера.

Публичное демо работает по адресу:

`https://etrn.stalarvision.ru`

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
- compact guided `DEMO-001` path derived from authoritative shipment state;
- full Chromium E2E happy path through `completed` including reset;
- controlled `DEMO-002` exception/recovery branch through `attention_required`;
- production API/web images and production Compose baseline;
- same-origin Nginx proxy inside the web container;
- CI production-stack build, migration, health, smoke and port-exposure checks;
- compact product intro, independent-developer positioning and commercial next step to StalarVision;
- bounded manual cleanup of expired guest sessions and cascaded synthetic data;
- repository-level production dependency audit and full-history Gitleaks scan;
- strict Nginx CSP/security headers with production response assertions;
- locally rehearsed production-like startup, logical PostgreSQL backup/restore and runtime restart persistence;
- public VPS deployment with host Nginx, DNS and TLS;
- daily PostgreSQL production backup with 7-day VPS retention;
- verified production restore into a separate temporary database;
- first verified off-VPS recovery copy on the owner's workstation;
- post-launch dependency advisory remediation with clean CI run #74;
- Stage 17A/17B product-code validation with clean CI run #81;
- Stage 17C product-code validation with clean CI run #85;
- Stage 17D product-code validation with clean CI run #87;
- controlled Stage 16C + Stage 17A–17D production release with external smoke;
- StalarVision favicon in the production browser tab, validated by CI #91.

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

Stage 16C дополнительно зафиксировал безопасный dependency baseline: `postcss 8.5.26`, `nanoid 3.3.18`, а `vite` и `@vitejs/plugin-react` находятся в `devDependencies`. CI #74 полностью успешен.

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

1. открыть демо без регистрации и получить изолированный guest session;
2. выбрать `DEMO-001` и следовать встроенной guided-подсказке;
3. ролью `warehouse` подтвердить прибытие автомобиля: `awaiting_loading → loading`;
4. ролью `warehouse` завершить погрузку: `loading → in_transit`;
5. ролью `driver` подтвердить прибытие к разгрузке: `in_transit → awaiting_unloading`;
6. ролью `consignee` начать разгрузку: `awaiting_unloading → unloading`;
7. ролью `consignee` завершить разгрузку: `unloading → awaiting_confirmation`;
8. ролью `consignee` подтвердить завершение перевозки: `awaiting_confirmation → completed`;
9. увидеть обновлённые статус, workflow progress и append-only историю событий;
10. выбрать `DEMO-002`, ролью `driver` перевести перевозку `in_transit → attention_required`, а ролью `manager` вернуть её `attention_required → in_transit`;
11. после recovery продолжить обычный lifecycle через существующее действие прибытия к разгрузке;
12. вернуть демо в детерминированное исходное состояние.

Клиент отправляет только named action и actor role. `nextState` вычисляется domain layer; прямое client-controlled изменение состояния запрещено.

## Важное ограничение

Проект:

- не является аккредитованным оператором ИС ЭПД;
- не подключён к ГИС ЭПД;
- не выполняет юридически значимое подписание;
- не хранит реальные перевозочные документы или персональные данные;
- не является production TMS или рабочим пространством реального клиента.

Используются только синтетические данные.

## Production baseline

Принятая production-топология:

```text
Internet
→ host Nginx + Certbot
→ 127.0.0.1:8083
→ web container / Nginx
→ api container
→ postgres container
```

Production URL:

`https://etrn.stalarvision.ru`

Stage 16 подтвердил DNS, HTTPS, HTTP→HTTPS redirect, external `/health`, session/bootstrap/list smoke, Secure guest cookie, production backup and restore verification.

8 августа 2026 года накопленный Stage 16C + Stage 17A–17D baseline был отдельно выпущен в production. Перед обновлением создан и проверен custom-format backup `etrn-flow-20260808T131846Z.dump`; после targeted API/web replacement внешний smoke подтвердил `DEMO-002` branch/recovery/continuation и reset. PostgreSQL при runtime replacement не перезапускался. После этого favicon update `90a8f81867f6bf1c0d6190ee91176e7b81793d25` был развернут пересборкой и пересозданием только web-контейнера; `/favicon.png` отвечает HTTP 200 и production HTML содержит `href="/favicon.png"`.

Operational paths, backup schedule, restore boundary and off-VPS recovery location зафиксированы в [`docs/PRODUCTION_OPERATIONS.md`](docs/PRODUCTION_OPERATIONS.md).

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

Stage 17A–17D не только приняты в repository baseline, но и прошли отдельный controlled production release gate с external smoke. Production сейчас соответствует принятому guided lifecycle + managed attention + commercial conversion baseline; последующий favicon update также развернут и проверен.

Текущий этап — post-release stabilization/documentation checkpoint. Новый feature stage не начинается автоматически. Следующее продуктово-функциональное направление должно быть отдельным осознанным решением после оценки демо и обратной связи заинтересованных лиц.

Analytics, authentication/RBAC, реальные operator/GIS integrations и расширение до полноценной TMS остаются вне текущего scope.
