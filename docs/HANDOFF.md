# ETRN Flow — Handoff

## Current state

- Private GitHub repository: `stalar78/etrn-flow-demo`.
- Stages 03–15B are accepted and merged into `main`.
- Stage 12B accepted merge commit: `a1e829ebbd695abc19078362d33a04ffd2b68c15`.
- Stage 13A accepted merge commit: `1a01396c63fe8523058aa938f47d8f7bc7cd3132`.
- Stage 14B accepted merge commit: `71a586aab08044c42b8c07f68e0a02cd2529e2e3`.
- Stage 15B accepted merge commit: `b4868f17563b256b4ca1973f11390f02ac46a942`.
- Latest accepted product-code merge: Stage 15B.
- Latest accepted GitHub CI for Stage 15B: run #54, successful, including `Checks` and `Production stack`.
- Public deployment has not been performed.
- Development continues locally.

## Current stage

`Browser E2E accepted → Production container baseline accepted → Guided product presentation accepted → Guest-session lifecycle hardening accepted → Public-release security/privacy hardening next`

## Product boundary

ETRN Flow is a public synthetic demonstration of a custom logistics workflow system built by one independent developer under the StalarVision brand.

It is not:

- an accredited EPD operator;
- a legally significant electronic-document platform;
- a replacement for an operator information system;
- a production TMS;
- a real customer workspace;
- connected to a real EPD operator or GIS EPD.

Only synthetic data may be used. Do not invent customers, companies, drivers, vehicles, addresses, metrics, legal statuses, integrations, testimonials or business results.

## Accepted technical baseline

### Workspace and runtime

- pnpm workspace with `apps/`, `packages/` and `infra/` boundaries.
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- PostgreSQL with Drizzle ORM.
- Validation with Zod.
- Modular monolith in one repository.
- CI covers install, lint, typecheck, tests, migrations, PostgreSQL integration tests, build, Chromium E2E and production-stack smoke.

### Guest sessions and abuse controls

- Backend-issued httpOnly guest-session cookie.
- Default 24-hour TTL.
- Missing, malformed, unknown and expired sessions are replaced.
- Reads, transitions and reset operations are scoped by the server-resolved guest session.
- Frontend never receives or sends a guest-session identifier as application data.
- `/health` is isolated from session/database behavior.
- PostgreSQL-backed `guest_session_usage_limits`.
- Protected POST endpoints: bootstrap, reset and shipment actions.
- Burst accounting runs after guest-session resolution in a separate short transaction.
- Lifetime mutation/reset accounting runs in the same business transaction as the mutation.
- Default public-demo limits: 60 mutations, 8 resets, 6 protected POST requests per 10-second burst window.
- Reset does not clear usage counters.
- Read endpoints and `/health` do not spend mutation or reset quota.

### Expired guest-session cleanup — Stage 15B

Accepted lifecycle policy:

- a session is eligible only when `expires_at < now() - interval '24 hours'`;
- PostgreSQL database time is authoritative;
- batch size: 500;
- maximum batches per run: 100;
- deterministic order: `expires_at ASC, id ASC`;
- bounded selection uses `FOR UPDATE SKIP LOCKED`;
- cleanup deletes only from `guest_sessions`;
- `shipments`, `shipment_events` and `guest_session_usage_limits` are removed by existing `ON DELETE CASCADE` relationships;
- the manual command is `corepack pnpm db:cleanup-expired-sessions`;
- cleanup is safe to rerun and reports aggregate counts only;
- no HTTP endpoint, startup cleanup, request-driven cleanup or scheduler was added.

The `guest_sessions.expires_at` cleanup path is indexed by `guest_sessions_expires_at_idx`.

### Shipment bootstrap, reads and workflow

- Three deterministic synthetic shipments:
  - `DEMO-001` → `awaiting_loading`;
  - `DEMO-002` → `in_transit`;
  - `DEMO-003` → `completed`.
- Bootstrap is transactional, idempotent and concurrent-safe.
- Shipment list/detail and events are guest-session scoped.
- Client sends only named domain action and actor role.
- Client never sends `guestSessionId` or `nextState`.
- Role/current-state validation uses the domain package.
- Guarded shipment update and append-only event occur in one transaction.
- Same-state concurrent transition race accepts one winner and one controlled loser.

### Controlled demo reset

- Reset derives session only from the server-issued cookie.
- `DemoResetService` owns orchestration.
- Reset runs in one PostgreSQL transaction.
- Same-session reset requests are serialized through `pg_advisory_xact_lock`.
- Only current-session shipment events and shipments are deleted.
- The deterministic bootstrap definitions are reused.
- Repeated and concurrent resets do not create duplicate shipments or event chains.
- Reset of one session does not alter another session.

### Frontend workflow

- Russian operational workspace with same-origin typed API client.
- Initialization remains health → session → bootstrap → list → deterministic selection → detail.
- Default selection prefers `DEMO-001`.
- Action availability is derived from server-returned state.
- Main demo path: `awaiting_loading → loading → in_transit`.
- No optimistic workflow or reset mutation.
- Reset requires explicit confirmation.
- Reset and transitions mutually exclude each other in UI controls and immediate handler guards.
- Controlled failures restore a usable phase and preserve the last complete valid snapshot when appropriate.

### Browser-level validation — Stage 12B / Stage 14B

- One mandatory Chromium E2E covers entry, bootstrap, `DEMO-001`, first transition, second transition, timeline update, reset and deterministic restoration.
- First-visit assertions cover product heading, instruction, disclaimer and CTA.
- Existing component/integration coverage remains in place.

### Production container baseline — Stage 13A

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

Implemented and accepted:

- multi-stage API and web images;
- non-root API runtime;
- one-shot migration service;
- production Compose with only `127.0.0.1:8082:8080` published;
- isolated production network/volume names;
- same-origin Nginx proxying;
- API graceful shutdown;
- container security/resource hardening appropriate to each runtime;
- production-stack CI validation, image build, migrations, health, same-origin smoke, exact port assertion and cleanup.

No VPS deployment has been performed.

## Core invariants

Every workflow state change must follow:

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

Direct status assignment through an API or frontend is forbidden.

Reset must follow:

```text
server-resolved guest session
→ transaction
→ same-session advisory lock
→ delete scoped events
→ delete scoped shipments
→ recreate deterministic dataset and histories
→ commit
→ authoritative frontend refresh
```

Protected POST abuse controls must follow:

```text
server-resolved guest session
→ burst accounting in a separate short transaction
→ business transaction
→ lifetime mutation/reset accounting inside the same business transaction as the mutation
→ commit or rollback
```

Expired-session maintenance must follow:

```text
manual maintenance command
→ database-authoritative 24h grace cutoff
→ bounded oldest-first batch
→ delete guest_sessions only
→ existing ON DELETE CASCADE
→ aggregate result
```

When detail is displayed:

```text
selectedShipmentId === detail.shipment.id
```

## Testing state

Accepted coverage includes:

- workflow domain transitions and denials;
- persistence repositories and transaction behavior;
- guest-session lifecycle and cross-session isolation;
- expired-session cleanup eligibility, batching, cascade behavior, idempotency and concurrent safety;
- deterministic bootstrap and concurrency;
- shipment list/detail API;
- transition success, denial, isolation and concurrency conflict;
- controlled reset behavior and cross-session isolation;
- quota/rate-limit exhaustion, rollback and isolation;
- frontend initialization, action execution, reset, stale-request guards and recovery;
- one Chromium E2E happy path with reset;
- product intro, synthetic boundary, CTA and first-visit E2E assertions;
- production Compose and same-origin stack smoke.

Latest accepted Stage 15B CI: run #54, successful.

## Next controlled stage

The next controlled stage is public-release security/privacy hardening before release rehearsal.

The stage should determine and implement only the local/repository changes genuinely required before public launch, including:

- dependency and secret scanning boundary;
- production header/CSP decision;
- privacy/cookie boundary for the strictly necessary guest-session cookie;
- pre-launch security checklist;
- clear separation between repository-level hardening and later host/deployment configuration.

Analytics implementation remains deferred. Legal/privacy statements must not be invented or presented as professional legal advice.

VPS, host Nginx, DNS, TLS, firewall and public deployment remain deferred to a dedicated deployment stage.

## Agent workflow rules

- GPT owns product direction, architecture review, scope and documentation.
- Все промпты для Codex пишутся на русском языке.
- Названия файлов, путей, компонентов, переменных, команд и других технических сущностей сохраняются в точном виде из кодовой базы.
- Codex changes code and approved technical configuration only.
- Codex must not edit documentation or Project Brain unless explicitly authorized.
- Codex must not commit, push or deploy unless separately authorized.
- GPT creates and reviews PRs and performs available GitHub operations.
- The owner has authorized Ready-for-review transitions and squash merges after successful review and green CI; deployment remains separately gated.
- After GPT updates `main`, the owner synchronizes with `git pull --ff-only origin main` before the next implementation branch.

## Active risks

- accidental positioning as an accredited operator;
- TMS scope expansion;
- public abuse-control tuning behind a reverse proxy;
- incorrect client-IP assumptions during eventual deployment hardening;
- backup/restore procedure not yet rehearsed;
- privacy/cookie wording not yet finalized;
- CSP/header boundary not yet finalized;
- stale frontend recovery regressions;
- premature integration or legal-significance claims;
- deployment beginning before release readiness is accepted.

## Documents to read first in a new chat

1. `PROJECT_BLUEPRINT.md`
2. `AGENTS.md`
3. `README.md`
4. `.architecture/overview.md`
5. `.architecture/modules.md`
6. `.architecture/security_notes.md`
7. `docs/PRODUCT_REQUIREMENTS.md`
8. `docs/SECURITY_POLICY.md`
9. `docs/HANDOFF.md`
