# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stage 10 accepted; guest-session quotas and public abuse controls next
- Repository: `https://github.com/stalar78/etrn-flow-demo`
- Architecture: modular monolith in a single workspace repository
- Accepted stack: React + TypeScript + Vite; Node.js + TypeScript + Fastify; PostgreSQL; Drizzle ORM; Zod; Docker Compose; Nginx

## 2. Purpose

Показать потенциальным клиентам, как индивидуальная веб-система может объединить рейсы, участников перевозки, статусы, события, уведомления и будущую интеграцию с оператором ИС ЭПД.

Проект создаётся как:

- коммерческая демонстрация компетенций StalarVision;
- самостоятельный продуктовый кейс;
- источник лидов с продуктовой страницы и Яндекс Директа;
- основа для дальнейшего пилота с реальным заказчиком.

## 3. Product boundary

ETRN Flow — публичная интерактивная демонстрация workflow-системы вокруг транспортных процессов.

Это не:

- аккредитованный оператор ИС ЭПД;
- замена операторской платформы;
- юридически значимая система электронных документов;
- production TMS;
- рабочее пространство реального клиента.

Используются только синтетические данные.

## 4. Success metric

Первая продуктовая метрика:

> Публичное демо позволяет посетителю без инструкции пройти основной сценарий перевозки за 3–5 минут и понять предложение StalarVision.

Первая коммерческая метрика:

> Получено хотя бы одно квалифицированное обращение по аудиту, интеграции или разработке системы вокруг ЭТрН после запуска целевого трафика.

## 5. Current MVP scope

В MVP входят:

- гостевой демонстрационный сеанс;
- детерминированный синтетический набор перевозок;
- список и карточка перевозки;
- последовательные workflow-действия;
- role-aware demo actions;
- журнал событий;
- контролируемый reset/restart демо-сценария;
- mock integration boundary;
- CTA StalarVision;
- аналитика ключевых действий;
- production deployment.

Не входят:

- реальная ГИС ЭПД;
- реальный оператор ИС ЭПД;
- КЭП, ПЭП, МЧД и криптография;
- реальные документы и персональные данные;
- 1С/CRM/ERP интеграции;
- биллинг;
- полноценная TMS;
- production multi-tenancy для клиентов.

## 6. Accepted implementation baseline

Merged into `main`:

- Stage 03 — workspace and application foundation;
- Stage 04 — PostgreSQL and Drizzle persistence foundation;
- Stage 05 — anonymous guest-session foundation;
- Stage 06 — session-scoped shipment read API and deterministic demo bootstrap;
- Stage 07 — transactionally safe shipment workflow transition API;
- Stage 08 — first usable frontend vertical slice;
- Stage 09 — sequential frontend workflow demo with recovery hardening;
- Stage 10 — controlled guest-session demo reset/restart.

Latest accepted Stage 10 merge commit:

`497afc9ee431022c9cf7286ae229a301ac48cc38`

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
- deterministic bootstrap with three synthetic shipments;
- explicit workflow actions and role/state validation;
- guarded state update and append-only event in one transaction;
- controlled `400`, `403`, `404`, `409` and `503` responses;
- concurrent transition conflict handling;
- transactional reset through a dedicated `DemoResetService`;
- same-session reset serialization through PostgreSQL advisory transaction locking;
- scoped deletion and exact deterministic recreation of shipment/event data;
- controlled `demo_reset_unavailable` response;
- PostgreSQL-backed integration coverage in CI.

## 8. Current frontend capabilities

- Russian operational demo workspace;
- same-origin typed API client with `credentials: "same-origin"`;
- health/session/bootstrap/list/detail initialization sequence;
- deterministic default selection preferring `DEMO-001`;
- responsive shipment list and detail layout;
- Russian labels for states, roles, actions and events;
- ordered event timeline;
- state-driven action availability for supported transitions;
- sequential `DEMO-001` path: `awaiting_loading → loading → in_transit`;
- supported draft actions: prepare for dispatch and confirmed cancellation;
- compact workflow progress presentation;
- separate terminal and exception-state presentation;
- refresh of list and detail after every server-confirmed transition;
- explicit reset confirmation;
- reset/transition mutual exclusion and double-submit protection;
- atomic post-reset workspace snapshot application;
- deterministic selection of `DEMO-001` after reset;
- preservation of the previous valid workspace if reset refresh fails;
- stale pre-reset detail protection;
- controlled initialization, transition, reset and recovery-refresh errors;
- disabled shipment switching during transition or reset;
- restoration of controls after transition, reset or refresh failure;
- persistent synthetic-data disclaimer;
- focused API-client and component tests.

## 9. Architecture overview

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

The system remains a modular monolith. Real external integration must be introduced later through a replaceable adapter contract, without coupling domain workflow to a specific operator SDK.

## 10. Workflow invariant

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

Reset is a separate explicit operation and must follow:

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

## 11. Guest session model

Implemented:

- entry without registration;
- backend-issued httpOnly cookie;
- all shipment reads, transitions and reset operations scoped by guest session;
- default TTL of 24 hours;
- invalid, missing, unknown and expired session replacement;
- production-aware `Secure` cookie behavior;
- controlled persistence failure handling;
- explicit repeatable reset of the current synthetic dataset.

Pending before public launch:

- quotas for shipments, events, transitions and reset requests;
- cleanup of expired sessions;
- public rate limiting;
- bounded abuse-response behavior.

Demo role presentation remains a frontend feature, not production RBAC.

## 12. Security model

- Synthetic demo data only.
- No real signatures, certificates or legal documents.
- No file uploads in the first MVP.
- Secrets only through environment configuration outside Git.
- Server-side validation with Zod.
- Session isolation enforced in database queries.
- Production cookies use `httpOnly`, `Secure` and appropriate `SameSite` settings.
- Frontend never accepts or transmits a guest-session id.
- Frontend never accepts or transmits a target next state.
- Reset accepts no client-selected session, state, shipment or seed data.
- Logs exclude personal and sensitive data.
- Production deployment remains manual in the first release cycle.

## 13. Testing baseline

CI validates:

- dependency installation;
- lint;
- typecheck;
- unit tests;
- database migrations;
- PostgreSQL integration tests;
- production build.

Accepted coverage includes:

- workflow domain rules;
- persistence repositories;
- guest-session behavior and isolation;
- deterministic bootstrap and event-chain coherence;
- shipment list/detail API;
- transition success, denial, isolation and concurrency conflict;
- API-client response parsing and safe payload construction;
- frontend initialization, selection, timeline and action execution;
- sequential action availability and second-step execution;
- confirmed destructive cancellation;
- progress, terminal and exception-state presentation;
- transition and reset double-submit protection;
- reset confirmation and cancellation;
- exact reset restoration of all three deterministic shipments;
- reset event-history recreation;
- repeated and concurrent same-session reset safety;
- cross-session reset isolation;
- atomic post-reset snapshot refresh;
- preservation of the previous complete UI snapshot on detail-refresh failure;
- stale normal-detail, transition-refresh and pre-reset detail protection;
- recovery-refresh failure handling with restored controls.

Still required before first deployment:

- quota and rate-limit integration tests;
- one browser-level end-to-end happy path including reset;
- production security and deployment audit;
- public abuse controls;
- stabilization of the existing concurrency integration assertion so both valid race outcomes are handled deterministically.

Latest accepted Stage 10 CI: run #32, successful.

## 14. AI-agent workflow

- GPT: product and technical architect, reviewer, keeper of scope and documentation.
- Codex: implementation of approved code and technical configuration only.
- User: project owner, runs Codex locally, reviews outcomes with GPT, performs pulls and approved production actions.

Rules:

- Codex prompts are written in Russian.
- File names, paths, components, variables and technical entities preserve their exact code names.
- Complex work uses Plan → approval → Build.
- GPT maintains documentation directly through GitHub.
- Codex does not modify project documentation unless explicitly authorized.
- Codex does not commit, push or deploy unless separately authorized.
- Merge requires explicit owner authorization.

## 15. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| Product mistaken for an accredited operator | Legal and reputational | Persistent demo disclaimer and clear positioning |
| Overbuilding a TMS | Long delay | Strict MVP and stage gates |
| Public abuse | Cost and instability | Rate limits, session quotas, reset quotas and expiry |
| Invalid state mutation | Corrupted demo history | Named actions, guarded persistence and append-only events |
| Frontend stale-response mismatch | Misleading UI | Shared request-version guard and selection invariant |
| Reset/transition overlap | Mixed state or confusing UI | Mutual exclusion in frontend and transactional backend operations |
| Reset breaks event history | Corrupted demo scenario | Scoped delete plus deterministic recreation in one transaction |
| Flaky concurrency test | Unreliable CI signal | Stabilize expected race outcomes without weakening backend guarantees |
| No demand after advertising | Lost time | Launch minimally, measure and refine |

## 16. Delivery estimate

Current estimate after Stage 10:

- technical demo MVP: approximately 78–84% complete;
- credible public portfolio demo: approximately 64–72% complete;
- working public demo MVP: about 2–3 focused working days if scope remains controlled;
- polished portfolio release: about 4–7 focused working days;
- real customer pilot remains a separate 3–6 week effort depending on authentication, integrations and operational requirements.

## 17. Current next step

Stage 11: introduce guest-session quotas and basic public abuse controls without turning the demo into a generic security platform.

The stage should:

- define explicit per-session limits for transitions and reset requests;
- decide whether shipment/event limits are enforced as hard invariants or derived from the deterministic dataset;
- return stable controlled errors when a quota is exhausted;
- preserve bootstrap, workflow, reset and guest-session isolation semantics;
- keep counters authoritative on the server;
- prevent concurrent requests from bypassing limits;
- avoid trusting client-provided counters or identity data;
- add minimal public rate limiting at the appropriate boundary;
- expose clear Russian recovery messages without leaking infrastructure details;
- add PostgreSQL-backed integration coverage for isolation, concurrency and limit exhaustion;
- avoid analytics, authentication, deployment and real integrations until their own stages.
