# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stages 03–15B accepted and merged; public-release security/privacy hardening is next
- Repository: `https://github.com/stalar78/etrn-flow-demo`
- Architecture: modular monolith in a single workspace repository
- Accepted stack: React + TypeScript + Vite; Node.js + TypeScript + Fastify; PostgreSQL; Drizzle ORM; Zod; Docker Compose; Nginx
- Latest accepted merge commit: `b4868f17563b256b4ca1973f11390f02ac46a942`
- Latest accepted Stage 15B CI: run #54, successful
- Public deployment status: not deployed

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
- журнал событий;
- контролируемый reset/restart демо-сценария;
- browser-level happy path;
- production container baseline;
- компактная публичная продуктовая подача;
- CTA StalarVision;
- bounded manual cleanup истёкших guest sessions и каскадное удаление связанных synthetic rows.

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
- аналитика и tracking vendor;
- публичный deployment.

## 6. Accepted implementation baseline

Merged into `main`:

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
- Stage 15B — expired guest-session cleanup and lifecycle hardening.

Accepted merge commits:

- Stage 12B: `a1e829ebbd695abc19078362d33a04ffd2b68c15`;
- Stage 13A: `1a01396c63fe8523058aa938f47d8f7bc7cd3132`;
- Stage 14B: `71a586aab08044c42b8c07f68e0a02cd2529e2e3`;
- Stage 15B: `b4868f17563b256b4ca1973f11390f02ac46a942`.

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
- rollback-safe lifetime mutation/reset accounting;
- controlled quota, rate-limit, conflict and persistence errors;
- transactional reset through `DemoResetService`;
- same-session reset serialization through PostgreSQL advisory transaction locking;
- PostgreSQL-backed integration coverage in CI;
- graceful SIGTERM/SIGINT shutdown in the production API runtime;
- manual expired-session cleanup command with database-authoritative cutoff and bounded batches.

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
- sequential `DEMO-001` path: `awaiting_loading → loading → in_transit`;
- supported draft actions: prepare for dispatch and confirmed cancellation;
- workflow progress presentation;
- reset confirmation, mutual exclusion and double-submit protection;
- atomic post-reset snapshot application;
- stale-request protection and controlled recovery;
- persistent synthetic-data boundary;
- compact `ProductIntro` above the workspace;
- one page-level `h1`;
- concise explanation of the business use case;
- independent-developer positioning for StalarVision;
- short DEMO-001 instruction;
- explicit non-legal/non-operator disclaimer;
- single CTA to `https://stalarvision.ru`;
- native `details/summary` disclosure.

## 9. Browser and CI baseline

Accepted browser coverage:

- one Chromium E2E happy path;
- entry and bootstrap;
- default `DEMO-001` selection;
- first transition;
- second transition;
- timeline verification;
- reset;
- deterministic restoration;
- first-visit product heading, instruction, disclaimer and CTA assertions.

Accepted GitHub CI jobs:

### `Checks`

- install;
- lint;
- typecheck;
- unit/component tests;
- migrations;
- persistence integration tests;
- build;
- Chromium installation;
- browser E2E.

### `Production stack`

- production Compose validation;
- production image build;
- PostgreSQL startup;
- one-shot migrations;
- API/web startup;
- health check;
- same-origin smoke;
- exact host-port exposure assertion;
- cleanup.

Latest accepted Stage 15B CI: run #54, successful.

## 10. Production container baseline

Accepted topology:

```text
Internet
→ host Nginx + Certbot
→ 127.0.0.1:8082
→ web container with Nginx
   ├─ serves Vite assets
   ├─ proxies /api/* to api:3000
   └─ proxies /health to api:3000
→ api container
→ postgres container
```

Accepted implementation:

- multi-stage API image based on Node 22 Alpine;
- compiled JavaScript runtime only;
- non-root API user;
- multi-stage web image with Nginx runtime;
- one-shot migration service;
- production Compose with only `127.0.0.1:8082:8080` published;
- isolated production network and volume names;
- same-origin proxying;
- bounded logs and resource limits;
- container hardening appropriate to API and web runtime constraints;
- `.env.production.example` without secrets.

This is only a local/CI production-container baseline. No VPS deployment, host Nginx configuration, TLS, DNS or firewall work has been accepted.

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

## 13. Security model

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
- Production deployment remains manual and explicitly gated.

Pending security/reliability work before a public release:

- public-release dependency and secret scanning decision;
- final CSP/header decision at the appropriate proxy boundary;
- privacy/cookie wording and owner/professional review where needed;
- production secret provisioning;
- backup/restore procedure and rehearsal;
- reverse-proxy-aware abuse-control calibration during deployment/release rehearsal.

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
| Public abuse tuning | Cost, instability or false positives | Conservative defaults and reverse-proxy-aware calibration |
| Invalid state mutation | Corrupted demo history | Named actions, guarded persistence and append-only events |
| Frontend stale-response mismatch | Misleading UI | Request-version guards and selection invariant |
| Reset/transition overlap | Mixed state | UI mutual exclusion and transactional backend operations |
| Unbounded expired demo data | Database growth | Accepted Stage 15B bounded cleanup command |
| Backup/restore not rehearsed | Operational recovery risk | Required before public deployment |
| Privacy/cookie wording unresolved | Compliance/reputation risk | Resolve boundary before release |
| Premature deployment | Operational risk and distraction | Dedicated deployment stage after release-readiness acceptance |

## 16. Current next step

The next controlled stage is public-release security/privacy hardening before release rehearsal.

It should first inspect the actual repository and accepted security docs, then implement only the smallest justified local changes. Candidate areas:

- dependency and secret scanning;
- production security headers and CSP boundary;
- privacy/cookie boundary;
- public-release security checklist;
- separation of repository-level controls from later host-level deployment hardening.

Do not automatically add analytics, authentication, RBAC, new product functionality or broad redesign.

The next stage must not include without a dedicated deployment decision:

- VPS access;
- host Nginx changes;
- DNS;
- TLS/Certbot;
- firewall changes;
- public deployment;
- real integrations.
