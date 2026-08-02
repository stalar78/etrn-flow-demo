# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stage 08 accepted; sequential workflow demo next
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
- Stage 08 — first usable frontend vertical slice.

Latest accepted Stage 08 merge commit:

`b2a24bd4c305f305e2ac86958ef45ff2480836bd`

## 7. Current backend capabilities

- validated database and session configuration;
- PostgreSQL migrations and scoped repositories;
- backend-issued httpOnly guest-session cookie;
- session replacement for missing, invalid, unknown and expired sessions;
- `/health` isolated from session and database work;
- `GET /api/session`;
- `POST /api/demo/bootstrap`;
- `GET /api/shipments`;
- `GET /api/shipments/:shipmentId`;
- `POST /api/shipments/:shipmentId/actions`;
- strict guest-session data isolation;
- deterministic bootstrap with three synthetic shipments;
- explicit workflow actions and role/state validation;
- guarded state update and append-only event in one transaction;
- controlled `400`, `403`, `404`, `409` and `503` responses;
- concurrent transition conflict handling;
- PostgreSQL-backed integration coverage in CI.

## 8. Current frontend capabilities

- Russian operational demo workspace;
- same-origin typed API client with `credentials: "same-origin"`;
- health/session/bootstrap/list/detail initialization sequence;
- deterministic default selection preferring `DEMO-001`;
- responsive shipment list and detail layout;
- Russian labels for states, roles, actions and events;
- ordered event timeline;
- one accepted action: `markVehicleArrived` by `warehouse`;
- refresh of list and detail after server-confirmed transition;
- controlled initialization and transition errors;
- stale detail and transition-refresh protection;
- disabled shipment switching during transition;
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

## 11. Guest session model

Implemented:

- entry without registration;
- backend-issued httpOnly cookie;
- all shipment reads and transitions scoped by guest session;
- default TTL of 24 hours;
- invalid, missing, unknown and expired session replacement;
- production-aware `Secure` cookie behavior;
- controlled persistence failure handling.

Pending before public launch:

- quotas for shipments, events and actions;
- reset endpoint;
- cleanup of expired sessions;
- public rate limiting.

Demo role switching remains a presentation feature, not production RBAC.

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
- stale normal-detail response protection;
- stale transition and conflict-refresh protection.

Still required before first deployment:

- reset and quota integration tests;
- one browser-level end-to-end happy path;
- production security and deployment audit;
- public abuse controls.

## 14. AI-agent workflow

- GPT: product and technical architect, reviewer, keeper of scope and documentation.
- Codex: implementation of approved code and technical configuration only.
- User: project owner, runs Codex locally, reviews outcomes with GPT, performs pulls and approved production actions.

Rules:

- Codex prompts are written in English.
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
| Public abuse | Cost and instability | Rate limits, session quotas, reset and expiry |
| Invalid state mutation | Corrupted demo history | Named actions, guarded persistence and append-only events |
| Frontend stale-response mismatch | Misleading UI | Shared request-version guard and selection invariant |
| Demo cannot be repeated | Weak public experience | Controlled reset/restart stage before deployment |
| No demand after advertising | Lost time | Launch minimally, measure and refine |

## 16. Delivery estimate

Current estimate after Stage 08:

- technical demo MVP: approximately 65–70% complete;
- credible public portfolio demo: approximately 50–60% complete;
- working public demo MVP: about 3–5 focused working days if scope remains controlled;
- polished portfolio release: about 6–10 focused working days;
- real customer pilot remains a separate 3–6 week effort depending on authentication, integrations and operational requirements.

## 17. Current next step

Stage 09: extend the current frontend/backend workflow slice into a short sequential demo journey without inventing new business rules.

The stage should:

- inspect the existing domain transition table and expose only already-supported actions;
- allow the selected demo shipment to advance through multiple accepted states;
- keep action and role values exact and server-validated;
- preserve transaction, event and guest-session invariants;
- update list, detail, timeline and available actions after every transition;
- retain stale-response protection;
- remain a focused operational workspace rather than a full dashboard;
- avoid reset, quotas, analytics, production deployment and real integrations until their own stages.
