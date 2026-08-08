# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stages 03–15D, Stage 16A–16C and Stage 16 Initial Production Launch accepted; Stage 17A and Stage 17B accepted
- Repository: `https://github.com/stalar78/etrn-flow-demo`
- Production demo: `https://etrn.stalarvision.ru`
- Architecture: modular monolith in a single workspace repository
- Accepted stack: React + TypeScript + Vite; Node.js + TypeScript + Fastify; PostgreSQL; Drizzle ORM; Zod; Docker Compose; Nginx
- Latest accepted product-code merge commit: `30aa5edb39b773f558a9f651e73e25aee72e9211` (Stage 17B)
- Stage 17A accepted merge commit: `43ea64c64e9f2daccdf33f477283c27b4fcad25b`
- Latest accepted product-code CI: run #81, successful
- Stage 15D: evidence-only local release rehearsal; no repository implementation changes
- Stage 16: evidence-only controlled VPS deployment on the accepted repository baseline
- Public deployment status: live, but Stage 17A/17B repository acceptance does not by itself mean those changes are deployed

## 2. Purpose

Показать потенциальным клиентам, как индивидуальная веб-система может объединить рейсы, участников перевозки, статусы, действия и историю событий в одном рабочем интерфейсе.

Проект создаётся как:

- коммерческая демонстрация компетенций StalarVision;
- самостоятельный продуктовый кейс;
- источник лидов с продуктовой страницы и целевого трафика;
- основа для дальнейшего пилота с реальным заказчиком.

Публичная подача должна представлять одного независимого разработчика, а не студию или агентство.

## 3. Product boundary

ETRN Flow — публичная интерактивная демонстрация workflow-системы вокруг транспортных процессов.

Это не:

- аккредитованный оператор ИС ЭПД;
- замена операторской платформы;
- юридически значимая система электронных документов;
- production TMS;
- рабочее пространство реального клиента;
- подключение к ГИС ЭПД или реальному оператору ИС ЭПД.

Используются только синтетические данные.

Запрещено придумывать клиентов, компании, отзывы, метрики, интеграции, сертификаты, юридические статусы или результаты реального внедрения.

## 4. Success metric

Первая продуктовая метрика:

> Публичное демо позволяет посетителю без отдельной инструкции пройти основной сценарий перевозки за 3–5 минут и понять предложение StalarVision.

Первая коммерческая метрика:

> Получено хотя бы одно квалифицированное обращение по аудиту, интеграции или разработке похожей системы после запуска целевого трафика.

Аналитика пока не реализована. События и поставщик аналитики должны определяться только после утверждения публичного пути пользователя, privacy boundary и необходимости consent/cookie policy.

## 5. Current MVP scope

В принятую реализацию входят:

- гостевой демонстрационный сеанс;
- детерминированный синтетический набор перевозок;
- список и карточка перевозки;
- последовательные workflow-действия;
- role-aware demo actions;
- полный `DEMO-001` happy path до `completed`;
- guided demo layer, выводимый из authoritative shipment state;
- журнал событий;
- контролируемый reset/restart демо-сценария;
- browser-level happy path through `completed`;
- production container baseline;
- компактная публичная продуктовая подача;
- CTA StalarVision;
- bounded manual cleanup истёкших guest sessions и каскадное удаление связанных synthetic rows;
- repository-level production dependency audit and full-history secret scanning;
- strict production Nginx CSP/security headers and response assertions;
- locally rehearsed production-like startup, logical PostgreSQL backup/restore and runtime restart persistence;
- controlled public VPS deployment with DNS, host Nginx and TLS;
- daily production backup with 7-day VPS retention;
- verified restore into a separate database and first off-VPS recovery copy;
- post-launch dependency advisory remediation with clean CI #74;
- Stage 17B full validation with clean CI #81.

Не входят:

- реальная ГИС ЭПД;
- реальный оператор ИС ЭПД;
- КЭП, ПЭП, МЧД и криптография;
- реальные документы и персональные данные;
- 1С/CRM/ERP интеграции;
- биллинг;
- полноценная TMS;
- production multi-tenancy для клиентов;
- authentication/RBAC;
- аналитика и tracking vendor.

## 6. Accepted implementation baseline

Merged/accepted:

- Stage 03 — workspace and application foundation;
- Stage 04 — PostgreSQL and Drizzle persistence foundation;
- Stage 05 — anonymous guest-session foundation;
- Stage 06 — session-scoped shipment read API and deterministic demo bootstrap;
- Stage 07 — transactionally safe shipment workflow transition API;
- Stage 08 — first usable frontend vertical slice;
- Stage 09 — sequential frontend workflow demo with recovery hardening;
- Stage 10 — controlled guest-session demo reset/restart;
- Stage 11 — guest-session quotas and public abuse controls;
- Stage 12A — concurrent transition integration semantics;
- Stage 12B — browser happy path, UX/accessibility and reset audit;
- Stage 13A — production container baseline and CI stack smoke;
- Stage 14B — guided product presentation and StalarVision CTA;
- Stage 15A — public-release readiness audit;
- Stage 15B — expired guest-session cleanup and lifecycle hardening;
- Stage 15C — repository-level public-release security hardening;
- Stage 15D — local release, backup/restore and restart rehearsal (evidence-only);
- Stage 16A — production host-port isolation on `127.0.0.1:8083`;
- Stage 16B — dev-tooling security maintenance before deployment;
- Stage 16 — Initial Production Launch on `https://etrn.stalarvision.ru` (evidence-only operational stage);
- Stage 16C — post-launch dependency security remediation (`postcss 8.5.26`, `nanoid 3.3.18`);
- Stage 17A — Guided Demo Experience;
- Stage 17B — Complete Transport Lifecycle.

Accepted merge commits:

- Stage 12B: `a1e829ebbd695abc19078362d33a04ffd2b68c15`;
- Stage 13A: `1a01396c63fe8523058aa938f47d8f7bc7cd3132`;
- Stage 14B: `71a586aab08044c42b8c07f68e0a02cd2529e2e3`;
- Stage 15B: `b4868f17563b256b4ca1973f11390f02ac46a942`;
- Stage 15C: `4ae57a70c1c1e0f5ef5455f4208e00a54870ab69`;
- Stage 16A: `5eefbc611c3ac3e0d5bdd3cffa49b1cdaf3b80c3`;
- Stage 16B: `c4e3ffbed9cf0f05c7c849755823e13a2ad605d6`;
- Stage 16C: `81a69da562bfe112584f353f1638f2443af3481a`;
- Stage 17A: `43ea64c64e9f2daccdf33f477283c27b4fcad25b`;
- Stage 17B: `30aa5edb39b773f558a9f651e73e25aee72e9211`.

Stage 15D and Stage 16 required no product-code merge.

## 7. Current backend capabilities

- validated database and session configuration;
- PostgreSQL migrations and scoped repositories;
- backend-issued httpOnly guest-session cookie;
- session replacement for missing, invalid, unknown and expired sessions;
- `/health` isolated from session and database work;
- `GET /api/session`;
- `POST /api/demo/bootstrap`;
- `POST /api/demo/reset`;
- `GET /api/shipments`;
- `GET /api/shipments/:shipmentId`;
- `POST /api/shipments/:shipmentId/actions`;
- strict guest-session data isolation;
- PostgreSQL-backed `guest_session_usage_limits`;
- server-authoritative usage accounting;
- deterministic bootstrap with three synthetic shipments;
- explicit workflow actions and role/state validation;
- guarded state update and append-only event in one transaction;
- burst limiting for protected POST endpoints after server-side guest-session resolution;
- accepted default burst policy: 8 protected POST requests per 10-second window;
- rollback-safe lifetime mutation/reset accounting;
- controlled quota, rate-limit, conflict and persistence errors;
- transactional reset through `DemoResetService`;
- same-session reset serialization through PostgreSQL advisory transaction locking;
- PostgreSQL-backed integration coverage in CI;
- graceful SIGTERM/SIGINT shutdown in the production API runtime;
- manual expired-session cleanup command with database-authoritative cutoff and bounded batches.

Accepted interactive `DEMO-001` workflow actions:

```text
awaiting_loading
→ markVehicleArrived / warehouse
→ loading
→ completeLoading / warehouse
→ in_transit
→ arriveForUnloading / driver
→ awaiting_unloading
→ startUnloading / consignee
→ unloading
→ completeUnloading / consignee
→ awaiting_confirmation
→ completeShipment / consignee
→ completed
```

The client submits only `action + actorRole`. `nextState` is domain-derived. `completed` remains terminal.

### Accepted expired-session cleanup policy

```text
manual command
→ PostgreSQL now() - 24h grace cutoff
→ expires_at ASC, id ASC
→ batch size 500
→ FOR UPDATE SKIP LOCKED
→ delete guest_sessions only
→ ON DELETE CASCADE children
→ aggregate result
```

Additional limits:

- maximum 100 batches per run;
- maximum 50,000 sessions per run;
- `guest_sessions_expires_at_idx` supports eligibility lookup;
- cleanup is safe to rerun;
- no scheduler, HTTP cleanup endpoint, request-driven cleanup or startup cleanup exists.

## 8. Current frontend capabilities

- Russian operational demo workspace;
- same-origin typed API client with `credentials: "same-origin"`;
- health/session/bootstrap/list/detail initialization sequence;
- deterministic default selection preferring `DEMO-001`;
- responsive shipment list and detail layout;
- Russian labels for states, roles, actions and events;
- ordered event timeline;
- state-driven action availability;
- sequential `DEMO-001` path through `completed`;
- `GuidedDemoPath` with four compact phases: arrival/loading, transport, unloading, completion;
- guided instructions derived from `reference + state`, without separate workflow state;
- `DEMO-002` and `DEMO-003` remain neutral prepared examples rather than expanded scenarios;
- supported draft actions: prepare for dispatch and confirmed cancellation;
- full-domain workflow progress presentation;
- reset confirmation, mutual exclusion and double-submit protection;
- atomic post-reset snapshot application;
- stale-request protection and controlled recovery;
- persistent synthetic-data boundary;
- compact `ProductIntro` above the workspace;
- one page-level `h1`;
- concise explanation of the business use case;
- independent-developer positioning for StalarVision;
- explicit non-legal/non-operator disclaimer;
- single CTA to `https://stalarvision.ru`;
- native `details/summary` disclosure.

## 9. Browser and CI baseline

Accepted browser coverage:

- one Chromium E2E happy path;
- entry and bootstrap;
- default `DEMO-001` selection;
- complete action sequence through `completed`;
- role/action labels across loading, transport and unloading;
- guided path completion;
- timeline verification;
- reset;
- deterministic restoration;
- first-visit product heading, instruction, disclaimer and CTA assertions.

Accepted GitHub CI jobs:

### `Checks`

- install;
- production dependency audit: `pnpm audit --prod --audit-level high`;
- lint;
- typecheck;
- unit/component tests;
- migrations;
- persistence integration tests;
- build;
- Chromium installation;
- browser E2E.

### `Security scan`

- full-history checkout;
- Gitleaks pinned to immutable action SHA;
- minimal `contents: read` and `pull-requests: read` job permissions.

### `Production stack`

- production Compose validation;
- production image build;
- PostgreSQL startup;
- one-shot migrations;
- API/web startup;
- health check;
- same-origin smoke;
- production response-header/CSP smoke;
- exact host-port exposure assertion;
- cleanup.

Latest accepted product-code CI: Stage 17B run #81, successful. `Checks`, `Security scan` and `Production stack` all passed, including PostgreSQL integration tests and Chromium E2E.

## 10. Production baseline

Accepted topology:

```text
Internet
→ host Nginx + Certbot
→ 127.0.0.1:8083
→ web container with Nginx
   ├─ serves Vite assets
   ├─ proxies /api/* to api:3000
   └─ proxies /health to api:3000
→ api container
→ postgres container
```

Accepted implementation and deployment:

- multi-stage API image based on Node 22 Alpine;
- compiled JavaScript runtime only;
- non-root API user;
- multi-stage web image with Nginx runtime;
- one-shot migration service;
- production Compose with only `127.0.0.1:8083:8080` published;
- same-origin proxying;
- bounded logs and resource limits;
- container hardening appropriate to API and web runtime constraints;
- `.env.production.example` without secrets;
- reusable `infra/nginx/security-headers.conf`;
- strict CSP and security headers applied to server and cache-specific locations;
- production checkout at `/home/stanislav/project/etrn-flow`;
- production environment at `/home/stanislav/project/etrn-flow/.env.production`, ignored by Git and mode `600`;
- public DNS and HTTPS endpoint `https://etrn.stalarvision.ru`;
- host Nginx reverse proxy to `127.0.0.1:8083`;
- Certbot-managed TLS with successful renewal dry-run;
- daily PostgreSQL custom-format backups at `03:20 UTC` with 7-day VPS retention;
- verified production restore into a separate temporary DB;
- first verified off-VPS recovery copy on the owner's Windows workstation.

Detailed operational paths and recovery rules are documented in [`docs/PRODUCTION_OPERATIONS.md`](docs/PRODUCTION_OPERATIONS.md).

Stage 17A/17B are currently repository-level accepted changes. A separate controlled release is required before claiming the production VPS is on the Stage 17B product-code baseline or the production environment uses the repository default burst value of 8.

## 11. Architecture overview

```text
Browser
  → React web application
  → same-origin Fastify API
  → application services
  → shipment workflow domain
  → PostgreSQL through Drizzle ORM
  → append-only events
  → UI refresh
```

Repository boundaries:

```text
apps/
  web/
  api/
packages/
  shared/
  domain/
infra/
```

The system remains a modular monolith. Real external integration must later be introduced through a replaceable adapter contract without coupling the domain workflow to a specific operator SDK.

## 12. Core invariants

Every state change must follow:

```text
named action
→ request validation
→ guest-session scope
→ role validation
→ current-state validation
→ guarded state transition
→ append event in the same transaction
→ API response
→ UI refresh
```

Direct status editing is forbidden.

Reset must follow:

```text
server-resolved guest session
→ transaction
→ same-session advisory lock
→ delete scoped events
→ delete scoped shipments
→ recreate deterministic dataset and histories
→ commit
→ authoritative list/detail refresh
```

Protected POST abuse controls must follow:

```text
server-resolved guest session
→ burst accounting in a separate short transaction
→ business transaction
→ lifetime mutation/reset accounting inside the same business transaction as the mutation
→ commit or rollback
```

Expired-session cleanup must follow:

```text
manual maintenance command
→ database-authoritative eligibility
→ bounded batch delete of guest_sessions
→ existing ON DELETE CASCADE
→ aggregate output only
```

When detail is displayed:

```text
selectedShipmentId === detail.shipment.id
```

## 13. Security and release-readiness model

- Synthetic demo data only.
- No real signatures, certificates or legal documents.
- No file uploads in the accepted MVP.
- Secrets only through environment configuration outside Git.
- Server-side validation with Zod.
- Session isolation enforced in database queries.
- Usage accounting is server-authoritative.
- Client-controlled counters, limits, session ids and target states are forbidden.
- Production cookies use `httpOnly`, `Secure` and appropriate `SameSite` settings.
- Reset accepts no client-selected session, state, shipment or seed data.
- Cleanup exposes no session IDs or synthetic payloads in success output.
- Controlled errors do not expose infrastructure details.
- Production dependency audit is enforced in CI.
- Full-history Gitleaks secret scanning is enforced in CI.
- Strict CSP and security response headers are asserted against production-like responses.
- Stage 16C full and production dependency audits are clean.
- Stage 17B CI #81 validates the expanded lifecycle together with integration, E2E, security and production-stack gates.
- Production updates remain manual and explicitly gated.

### Stage 15D accepted rehearsal evidence

- production Compose config validated with complete synthetic env;
- `POSTGRES_PASSWORD` and `DATABASE_URL` consistency was confirmed as an operational requirement;
- clean PostgreSQL initialization and migrations passed;
- `postgres`, `api`, `web` became healthy;
- `/health`, session, bootstrap and shipment-list smoke passed through the web/Nginx boundary;
- Secure guest-session cookie was issued and reused;
- logical backup was created using `pg_dump -Fc` and copied outside the container;
- restore into separate `etrn_flow_restore_test` DB returned the pre-reset shipment UUIDs and states;
- restored counts: 1 guest session, 3 shipments, 14 shipment events, 1 usage-limit row, 3 Drizzle migration records;
- restart of `api` and `web` preserved current PostgreSQL state;
- all rehearsal artifacts and temporary Docker resources were removed after acceptance.

### Stage 16 accepted production evidence

- isolated VPS placement passed;
- production secrets were provisioned outside Git;
- production Compose validation passed;
- migrations completed successfully;
- `postgres`, `api` and `web` reached healthy state;
- host Nginx routing and `X-Forwarded-Proto` path were accepted;
- DNS resolved to the production VPS;
- Certbot TLS issuance and auto-renew dry-run passed;
- HTTP redirects to HTTPS;
- public `/`, `/health`, `/api/session`, `/api/demo/bootstrap` and `/api/shipments` smoke passed over HTTPS;
- first production logical backup was readable and successfully restored into a separate temporary database;
- restored production snapshot contained 5 guest sessions, 15 shipments, 70 shipment events and 5 usage-limit rows;
- daily backup schedule and 7-day VPS retention are active;
- first off-VPS recovery copy was verified on the owner's workstation.

### Stage 16C accepted dependency-security evidence

- `vite` and `@vitejs/plugin-react` moved to `devDependencies`;
- `postcss` resolves to `8.5.26` and `nanoid` to `3.3.18`;
- full and production audits passed locally;
- CI #74 passed `Checks`, `Security scan` and `Production stack`;
- no application logic, API, schema, Docker/Compose, Nginx, production ports or deployment configuration changed.

### Stage 17A/17B accepted evidence

- Stage 17A introduced a compact guided demo layer without backend/API/schema changes;
- Stage 17B added `arriveForUnloading`, `startUnloading`, `completeUnloading` and `completeShipment` through existing domain rules;
- the client contract remains `action + actorRole` with server/domain-derived `nextState`;
- guarded persistence and append-only event semantics remain unchanged;
- full `DEMO-001` integration path reaches `completed` and rejects a repeated terminal transition;
- default burst limit changed from 6 to 8 protected POST requests per 10 seconds so bootstrap plus the full six-action path remains usable without bypasses;
- CI #81 passed `Checks`, `Security scan` and `Production stack`.

Rate limiting is guest-session based, not client-IP based. Host proxy configuration preserves protocol semantics, but IP-based abuse-control semantics are not part of the accepted application baseline.

## 14. AI-agent workflow

- GPT: product and technical architect, reviewer, keeper of scope and documentation.
- Codex: implementation of approved code and technical configuration only.
- User: project owner, runs Codex locally and performs approved production actions.

Rules:

- Все промпты для Codex пишутся на русском языке.
- Названия файлов, путей, компонентов, переменных, команд и других технических сущностей сохраняются в точном виде из кодовой базы.
- Complex work uses Plan → approval → Build.
- GPT maintains documentation directly through GitHub.
- Codex does not modify project documentation unless explicitly authorized.
- Codex does not commit, push or deploy unless separately authorized.
- The owner has authorized GPT to move reviewed green-CI PRs to Ready and squash-merge them without asking again; production deployment remains separately gated.

## 15. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| Product mistaken for an accredited operator | Legal and reputational | Persistent synthetic/non-legal/non-operator disclaimer |
| Overbuilding a TMS | Long delay | Strict MVP and stage gates |
| Invalid state mutation | Corrupted demo history | Named actions, guarded persistence and append-only events |
| Frontend stale-response mismatch | Misleading UI | Request-version guards and selection invariant |
| Reset/transition overlap | Mixed state | UI mutual exclusion and transactional backend operations |
| Unbounded expired demo data | Database growth | Accepted Stage 15B bounded cleanup command |
| Backup exists only on VPS | Recovery risk after VPS loss | Maintain verified off-VPS recovery copies |
| Production secrets mishandled | Security exposure | Keep `.env.production` outside Git with restricted permissions |
| Neighbor project impact during VPS work | Cross-project outage | ETRN-only paths, port, Nginx site and targeted Docker operations |
| Unreviewed live update | Production regression | Review/CI plus explicit release gate for each completed stage |

## 16. Current next step

Stage 17A Guided Demo Experience and Stage 17B Complete Transport Lifecycle are accepted. The project now has a complete guided happy path in the repository baseline.

Stage 17C should remain one focused product increment. The two strongest candidates are:

- demo depth — one controlled synthetic exception/attention scenario that demonstrates operational value beyond the happy path without expanding into full TMS scope;
- commercial layer — a clearer connection from the demo to StalarVision services and a qualified inquiry, without invented customers, outcomes or integrations.

Do not combine both directions automatically. Select one based on the next product decision.

Do not automatically add analytics, authentication, RBAC, real integrations, product redesign or broad new functionality without a separate stage decision.

Future accepted stages follow:

```text
plan
→ implementation
→ review/CI
→ accepted stage
→ controlled production release
→ external smoke
→ production acceptance
```
