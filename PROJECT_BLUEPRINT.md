# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Architecture accepted; first Build stage pending
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

## 6. Architecture overview

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

## 7. Core modules

| Module | Responsibility | MVP notes |
|---|---|---|
| Demo access | Guest session, isolation, quotas, expiry and reset | No production registration |
| Organizations | Synthetic transport participants | Minimal fields only |
| Drivers | Driver assignment and demo actions | No sensitive documents |
| Vehicles | Vehicle assignment | No GPS, maintenance or fleet management |
| Shipments | Main aggregate | Route, participants, state and deadlines |
| Cargo | Simplified cargo details | No product certification model |
| Workflow | Explicit states, named actions and role checks | No generic workflow engine |
| Demo documents | Visual process representation | No legal force |
| Events | Append-only action history | Used by UI and demo audit trail |
| Attention center | Delays, discrepancies and failures | Added after core slice |
| Notifications | Internal reminder simulation | No external delivery in initial MVP |
| Analytics | Product funnel events | No personal data |
| Integration adapters | Mock now, operator-specific later | Isolated boundary |

## 8. Data flow

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

## 9. External integrations

| Integration | MVP | Future | Risk |
|---|---:|---:|---|
| Operator IS EPD API | Mock only | Yes | Contract, legal and format variability |
| 1C | No | Yes | Customer-specific configurations |
| CRM / ERP | No | Yes | Different data contracts |
| Yandex Metrica | Yes before public launch | Yes | Do not send personal data |
| Email / Telegram | Internal imitation | Optional | Consent, rate limits, secrets |

## 10. Guest session model

- Entry without registration.
- Backend-issued httpOnly cookie.
- Every mutable record belongs to one guest session.
- API always scopes reads and writes by that session.
- Recommended TTL: 24 hours.
- Quotas apply to shipments, events and actions.
- Reset recreates the guest workspace.
- Expired sessions are removed by cleanup logic.
- Demo role switching is a presentation feature, not production RBAC.

## 11. AI-agent workflow

- GPT: product and technical architect, reviewer, keeper of scope and documentation.
- Codex: implementation of approved code and technical configuration only.
- User: project owner, runs Codex locally, reviews outcomes with GPT, performs pulls and approved production actions.

Rules:

- Codex prompts are written in English.
- Complex work uses Plan → approval → Build.
- GPT maintains documentation directly through GitHub.
- Codex does not modify project documentation unless explicitly authorized for a narrow technical reason.
- Codex does not commit, push or deploy unless separately authorized.

## 12. Security model

- Synthetic demo data only.
- No real signatures, certificates or legal documents.
- No file uploads in the first MVP.
- Secrets only through environment configuration outside Git.
- Server-side validation with Zod.
- Session isolation and quotas.
- Rate limiting for public endpoints.
- Production cookies use `httpOnly`, `Secure` and appropriate `SameSite` settings.
- CORS is restricted to the frontend origin.
- Logs exclude personal and sensitive data.
- Production deployment remains manual in the first release cycle.

## 13. Testing baseline

Required before first deployment:

- workflow transition unit tests;
- role-action unit tests;
- API integration tests for guest session, shipment read, transition, event append and reset;
- key frontend component tests;
- one end-to-end happy path;
- lint, typecheck and production build.

## 14. Commands

The Makefile is created in the first Build stage and must wrap only real package scripts:

```bash
make install
make dev
make test
make lint
make typecheck
make build
```

## 15. Documentation map

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

## 16. Key decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-08-02 | Start with a public demo, not a real EPD platform | Validate demand without regulatory and integration overhead |
| 2026-08-02 | Product page and demo are separate surfaces | Landing sells; demo proves capability |
| 2026-08-02 | Use only synthetic data | Security, privacy and public portfolio safety |
| 2026-08-02 | Real operator integration is out of MVP | Depends on first customer and operator API |
| 2026-08-02 | Use a modular monolith | Strong boundaries without distributed-system overhead |
| 2026-08-02 | Use React/Vite + Fastify + PostgreSQL/Drizzle | Practical full-stack proof for one developer |
| 2026-08-02 | Use explicit workflow actions | Prevent invalid arbitrary status changes |
| 2026-08-02 | GPT owns documentation updates | Keep Codex focused on implementation and reduce context cost |

## 17. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| Product mistaken for an accredited operator | Legal and reputational | Persistent demo disclaimer and clear positioning |
| Overbuilding a TMS | Long delay | Strict MVP and stage gates |
| Demo looks like static mockup | Weak trust | Full vertical slice with API, persistence and events |
| Unverified legal detail | Misleading content | Separate product workflow from legal EPD specification |
| Public abuse | Cost and instability | Rate limits, session quotas, reset, expiry and synthetic data |
| No demand after advertising | Lost time | Launch minimally, measure and refine |

## 18. Delivery estimate

- Foundation: 4–6 working days.
- First vertical slice: 3–5 working days after foundation.
- Minimum public MVP: 18–26 working days after foundation.
- Hardening and deployment: 5–8 working days.
- Overall target remains 5–7 calendar weeks if scope remains controlled.

## 19. Current next step

Prepare and execute the first Build-stage Codex task for the technical foundation. The first implementation must not attempt the whole MVP. It should create the workspace, real commands, web/API skeleton, core workflow package and tests needed for the subsequent vertical slice.
