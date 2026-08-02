# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stage 06 accepted; workflow transition API next
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

## 3. Primary target user

Основной первый сегмент: небольшая или средняя компания с регулярными автомобильными грузоперевозками, собственным диспетчером или отделом логистики и отсутствием удобного единого интерфейса вокруг ЭТрН.

Основной представитель клиента: руководитель логистики, собственник, операционный директор или IT-ответственный.

## 4. Success metric

Первая продуктовая метрика:

> Публичное демо позволяет посетителю без инструкции пройти основной сценарий перевозки за 3–5 минут и понять предложение StalarVision.

Первая коммерческая метрика:

> Получено хотя бы одно квалифицированное обращение по аудиту, интеграции или разработке системы вокруг ЭТрН после запуска целевого трафика.

## 5. Current scope

В MVP входят:

- гостевой демонстрационный вход;
- dashboard;
- список рейсов;
- мастер создания рейса;
- карточка перевозки;
- role switching;
- mobile-first интерфейс водителя;
- действия склада и грузополучателя;
- проблемные сценарии;
- журнал событий;
- mock integration adapter;
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

## 6. Implemented baseline

Accepted and merged into `main`:

- Stage 03 — workspace and application foundation;
- Stage 04 — PostgreSQL and Drizzle persistence foundation;
- Stage 05 — anonymous guest-session foundation;
- Stage 06 — session-scoped shipment read API and deterministic demo bootstrap.

Current backend capabilities:

- validated database and session configuration;
- PostgreSQL migrations and scoped repositories;
- append-only shipment events with deterministic sequence ordering;
- backend-issued httpOnly guest-session cookie;
- session replacement for missing, invalid, unknown and expired sessions;
- `/health` isolated from session and database work;
- `GET /api/session`;
- `POST /api/demo/bootstrap`;
- `GET /api/shipments`;
- `GET /api/shipments/:shipmentId`;
- transactionally safe and concurrent-idempotent demo bootstrap;
- three synthetic shipments with coherent event histories;
- strict guest-session data isolation;
- controlled `400`, `404` and `503` responses;
- PostgreSQL-backed integration coverage in CI.

## 7. Architecture overview

```text
Browser
  → React web application
  → Fastify API
  → application services
  → shipment workflow domain
  → PostgreSQL through Drizzle ORM
  → mock operator adapter
  → synthetic response and append-only events
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

## 8. Core modules

| Module | Responsibility | Current status |
|---|---|---|
| Demo access | Guest session, isolation, quotas, expiry and reset | Session lifecycle implemented; quotas/reset/cleanup pending |
| Organizations | Synthetic transport participants | Pending |
| Drivers | Driver assignment and demo actions | Pending |
| Vehicles | Vehicle assignment | Pending |
| Shipments | Main aggregate | Persistence, bootstrap and read API implemented |
| Cargo | Simplified cargo details | Pending |
| Workflow | Explicit states, named actions and role checks | Domain rules exist; HTTP transition slice pending |
| Demo documents | Visual process representation | Pending; no legal force |
| Events | Append-only action history | Persistence and read path implemented |
| Attention center | Delays, discrepancies and failures | Later stage |
| Notifications | Internal reminder simulation | Later stage |
| Analytics | Product funnel events | Before public launch |
| Integration adapters | Mock now, operator-specific later | Pending |

## 9. Data flow

```text
User action
→ guest session resolution
→ request validation
→ role and state validation
→ workflow transition
→ shipment persistence
→ append event
→ optional mock adapter response
→ API response
→ UI refresh
→ product analytics event
```

Direct status editing is forbidden. State changes occur only through approved domain actions.

## 10. External integrations

| Integration | MVP | Future | Risk |
|---|---:|---:|---|
| Operator IS EPD API | Mock only | Yes | Contract, legal and format variability |
| 1C | No | Yes | Customer-specific configurations |
| CRM / ERP | No | Yes | Different data contracts |
| Yandex Metrica | Yes before public launch | Yes | Do not send personal data |
| Email / Telegram | Internal imitation | Optional | Consent, rate limits, secrets |

## 11. Guest session model

Implemented:

- entry without registration;
- backend-issued httpOnly cookie;
- all shipment reads scoped by guest session;
- default TTL of 24 hours;
- invalid, missing, unknown and expired session replacement;
- production-aware `Secure` cookie behavior;
- controlled persistence failure handling.

Pending:

- quotas for shipments, events and actions;
- reset endpoint;
- cleanup of expired sessions;
- public rate limiting.

Demo role switching remains a presentation feature, not production RBAC.

## 12. AI-agent workflow

- GPT: product and technical architect, reviewer, keeper of scope and documentation.
- Codex: implementation of approved code and technical configuration only.
- User: project owner, runs Codex locally, reviews outcomes with GPT, performs pulls and approved production actions.

Rules:

- Codex prompts are written in English.
- Complex work uses Plan → approval → Build.
- GPT maintains documentation directly through GitHub.
- Codex does not modify project documentation unless explicitly authorized for a narrow technical reason.
- Codex does not commit, push or deploy unless separately authorized.

## 13. Security model

- Synthetic demo data only.
- No real signatures, certificates or legal documents.
- No file uploads in the first MVP.
- Secrets only through environment configuration outside Git.
- Server-side validation with Zod.
- Session isolation enforced in database queries.
- Production cookies use `httpOnly`, `Secure` and appropriate `SameSite` settings.
- CORS will be restricted to the frontend origin before deployment.
- Logs exclude personal and sensitive data.
- Production deployment remains manual in the first release cycle.

## 14. Testing baseline

Already covered:

- workflow domain unit tests;
- persistence integration tests;
- guest-session unit and PostgreSQL integration tests;
- demo bootstrap unit tests;
- shipment read and session-isolation integration tests;
- migration checks, lint, typecheck, tests and production build in CI.

Still required before first deployment:

- workflow transition API unit and integration tests;
- role/action denial tests at the HTTP boundary;
- reset and quota integration tests;
- key frontend component tests;
- one end-to-end happy path;
- security and deployment audit.

## 15. Commands

The Makefile wraps real package scripts:

```bash
make install
make dev
make test
make lint
make typecheck
make build
```

Database and integration validation are also available through workspace scripts and CI.

## 16. Documentation map

| File / folder | Purpose |
|---|---|
| `README.md` | Entry point and current status |
| `AGENTS.md` | Compact agent rules |
| `docs/PRODUCT_REQUIREMENTS.md` | Full product and MVP requirements |
| `docs/AI_ARCHITECT_WORKFLOW.md` | Roles and workflow |
| `docs/STAGE_WORKFLOW.md` | Stage lifecycle |
| `docs/SECURITY_POLICY.md` | Security rules |
| `docs/DOCS_MAINTENANCE.md` | Documentation policy |
| `docs/HANDOFF.md` | Current state for a new chat |
| `.business/` | Business context |
| `.idea/` | Idea validation and MVP |
| `.architecture/` | System design |
| `.plans/` | Accepted stage plans |
| `.security/` | Operational security memory |

## 17. Key decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-08-02 | Start with a public demo, not a real EPD platform | Validate demand without regulatory and integration overhead |
| 2026-08-02 | Product page and demo are separate surfaces | Landing sells; demo proves capability |
| 2026-08-02 | Use only synthetic data | Security, privacy and public portfolio safety |
| 2026-08-02 | Real operator integration is out of MVP | Depends on first customer and operator API |
| 2026-08-02 | Use a modular monolith | Strong boundaries without distributed-system overhead |
| 2026-08-02 | Use React/Vite + Fastify + PostgreSQL/Drizzle | Practical full-stack proof for one developer |
| 2026-08-02 | Use explicit workflow actions | Prevent invalid arbitrary status changes |
| 2026-08-02 | Scope all shipment access by guest session in SQL | Prevent cross-session disclosure |
| 2026-08-02 | Use deterministic, transactionally safe demo bootstrap | Reliable public demo behavior under retries and concurrency |
| 2026-08-02 | GPT owns documentation updates | Keep Codex focused on implementation and reduce context cost |

## 18. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| Product mistaken for an accredited operator | Legal and reputational | Persistent demo disclaimer and clear positioning |
| Overbuilding a TMS | Long delay | Strict MVP and stage gates |
| Demo looks like static mockup | Weak trust | Full vertical slice with API, persistence and events |
| Unverified legal detail | Misleading content | Separate product workflow from legal EPD specification |
| Public abuse | Cost and instability | Rate limits, session quotas, reset, expiry and synthetic data |
| Invalid state mutation | Corrupted demo history | Named actions, guarded persistence and append-only events |
| No demand after advertising | Lost time | Launch minimally, measure and refine |

## 19. Delivery estimate

- Foundation and persistence baseline: accepted.
- Guest-session and shipment-read baseline: accepted.
- Workflow transition backend slice: next controlled stage.
- Frontend vertical slice follows after transition behavior is proven.
- Minimum public MVP target remains 5–7 calendar weeks if scope remains controlled.

## 20. Current next step

Implement the first workflow transition API slice.

The stage must:

- expose one controlled shipment action endpoint;
- use the existing framework-independent workflow domain rules;
- derive guest-session ownership from the resolved server session;
- validate actor role and current state;
- update shipment state with optimistic guarding;
- append the matching event in the same database transaction;
- return controlled conflict/forbidden/not-found responses;
- preserve append-only event history and session isolation;
- include unit and PostgreSQL-backed API integration tests;
- avoid frontend work, arbitrary status editing, generic workflow engines and real operator integration.
