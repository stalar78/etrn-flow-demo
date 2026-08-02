# ETRN Flow — Handoff

## Current state

- Private GitHub repository is active: `stalar78/etrn-flow-demo`.
- Product requirements, architecture and Project Brain are committed.
- Stage 03 foundation was accepted and merged.
- Stage 04 PostgreSQL/Drizzle persistence foundation was accepted and merged.
- Stage 05 anonymous guest-session foundation was accepted and merged.
- Stage 06 session-scoped shipment read API was accepted and merged.
- Latest accepted Stage 06 merge commit: `1664abcb14a5e405068b656330a46b0a718ff0eb`.
- Project documentation was synchronized after Stage 06.

## Current stage

`Shipment read baseline accepted → Workflow transition API next`

## Accepted technical baseline

### Workspace and runtime

- pnpm workspace with `apps/`, `packages/` and `infra/` boundaries.
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Modular monolith in one repository.
- Workspace packages emit runnable ESM JavaScript and declarations to `dist`.
- Plain-Node API runtime was smoke-tested after production builds.

### Persistence

- PostgreSQL with Drizzle ORM.
- Validated `DATABASE_URL` configuration.
- Versioned migrations and CI migration checks.
- Tables for guest sessions, shipments and append-only shipment events.
- Per-session shipment reference uniqueness.
- Deterministic event sequence ordering.
- Repository contracts separated from PostgreSQL implementations.
- Transaction wrapper available to application services.
- Guarded shipment-state update support exists in persistence.

### Guest sessions

- Backend-issued httpOnly guest-session cookie.
- Default 24-hour TTL.
- Production-aware `Secure` cookie configuration.
- Missing, malformed, unknown and expired sessions are replaced.
- `last_seen_at` is updated when a valid session is reused.
- One shared database lifecycle per Fastify app instance.
- `/health` remains isolated from session and database behavior.
- `GET /api/session` is implemented.
- Persistence failures return controlled `503` responses.

### Shipment read slice

- Reusable route-level guest-session boundary.
- `POST /api/demo/bootstrap`.
- `GET /api/shipments`.
- `GET /api/shipments/:shipmentId`.
- Exactly three deterministic synthetic shipments:
  - `DEMO-001` → `awaiting_loading`;
  - `DEMO-002` → `in_transit`;
  - `DEMO-003` → `completed`.
- Every demo shipment has a contiguous event history from `draft` to its stored state.
- Bootstrap is transactional, idempotent and safe under concurrent requests.
- Shipment list is session-scoped, deterministically ordered and bounded.
- Shipment detail and event history are scoped by both session and shipment id.
- Malformed ids return controlled `400`.
- Unknown and foreign-session ids return indistinguishable `404` responses.
- Database failures return controlled `503` responses.

## Accepted architecture

- Modular monolith in one repository.
- Database: PostgreSQL.
- Data access: Drizzle ORM.
- Validation: Zod.
- Deployment target: Docker Compose on one VPS behind Nginx.
- Integration: mock adapter only in MVP; future real operators attach through a replaceable adapter boundary.
- Domain workflow remains framework-independent.
- Direct status editing is forbidden.

## Accepted product direction

- Public interactive demo, not a legal EPD platform.
- No real operator, GIS EPD, signatures, MChD, documents or personal data in MVP.
- Synthetic data only.
- Separate commercial page on StalarVision and separate demo subdomain.
- Minimal credible release first; modernization continues after deployment.
- Do not expand into a full TMS.

## Workflow invariant

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

Direct status assignment through an API is not allowed.

## Next controlled stage

The next stage is the first workflow transition API slice.

It should establish:

- one controlled shipment action endpoint;
- use of the existing framework-independent workflow domain package;
- server-derived guest-session ownership only;
- request validation for shipment id, action and actor role;
- role and current-state validation before persistence;
- optimistic guarded shipment update;
- append-only event creation in the same PostgreSQL transaction;
- deterministic response DTOs;
- controlled not-found, forbidden, invalid-transition and concurrency-conflict responses;
- PostgreSQL-backed integration tests for success, denial, isolation, event append and race behavior;
- no frontend work yet;
- no arbitrary shipment creation or status editing;
- no generic workflow engine;
- no real operator integration.

## First vertical slice after transition API

After the transition backend is accepted, the frontend vertical slice should prove:

1. web and API run locally;
2. guest session is created or resolved;
3. deterministic demo shipments are bootstrapped;
4. shipment list and detail render;
5. one allowed action is selected from the UI;
6. backend validates role and state;
7. shipment state changes transactionally;
8. an event is appended;
9. UI status and history refresh;
10. StalarVision positioning and demo disclaimer are visible.

## Testing state

CI currently validates:

- install;
- lint;
- typecheck;
- unit tests;
- database migrations;
- all PostgreSQL integration tests;
- production build.

Accepted coverage includes:

- workflow domain rules;
- persistence repositories;
- guest-session behavior;
- cookie configuration;
- demo bootstrap behavior and event-chain coherence;
- concurrent bootstrap idempotency;
- cross-session shipment isolation;
- deterministic list and event ordering;
- controlled `400`, `404` and `503` responses;
- `/health` session isolation.

## Agent workflow rules

- GPT maintains all project documentation directly through GitHub.
- Codex prompts are written in English.
- Codex works on code and approved technical configuration only.
- Codex must not modify documentation or Project Brain unless explicitly authorized.
- Codex must not commit, push or deploy unless separately authorized.
- The owner commits and pushes Codex changes to a stage branch.
- GPT creates/reviews PRs and performs available GitHub operations.
- The owner synchronizes local state with `git pull --ff-only origin main` after GPT GitHub changes.

## Active risks

- accidental positioning as an accredited operator;
- excessive scope and TMS overbuilding;
- bypassing domain workflow rules in HTTP handlers;
- state update and event append occurring outside one transaction;
- weak handling of concurrent transition requests;
- leaking existence of another session’s shipment;
- mutable or deletable event history;
- premature frontend polish before transition correctness is proven;
- public abuse before quotas and rate limiting are implemented.

## Documents to read first in a new chat

1. `PROJECT_BLUEPRINT.md`
2. `AGENTS.md`
3. `README.md`
4. `.plans/stage_02_architecture_plan.md`
5. `docs/PRODUCT_REQUIREMENTS.md`
6. `docs/SECURITY_POLICY.md`
7. `docs/HANDOFF.md`
