# ETRN Flow — Handoff

## Current state

- Private GitHub repository: `stalar78/etrn-flow-demo`.
- Stages 03–10 are accepted and merged into `main`.
- Latest accepted product-code merge: Stage 10, commit `497afc9ee431022c9cf7286ae229a301ac48cc38`.
- `PROJECT_BLUEPRINT.md` was synchronized after Stage 10 in commit `7f2f17c29c7c4e1dabc3defe9a5bff947cdf7a8f`.
- Current next stage: Stage 11 guest-session quotas and basic public abuse controls.

## Current stage

`Controlled demo reset accepted → Quotas and public abuse controls next`

## Product boundary

ETRN Flow is a public synthetic demonstration of a custom logistics workflow system.

It is not:

- an accredited EPD operator;
- a legal electronic-document platform;
- a replacement for an operator information system;
- a production TMS;
- a real customer workspace.

Only synthetic data may be used. Do not invent customers, companies, drivers, vehicles, addresses, metrics, legal statuses or integrations.

## Accepted technical baseline

### Workspace and runtime

- pnpm workspace with `apps/`, `packages/` and `infra/` boundaries.
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- PostgreSQL with Drizzle ORM.
- Validation with Zod.
- Modular monolith in one repository.
- CI covers install, lint, typecheck, tests, migrations, PostgreSQL integration tests and build.

### Guest sessions

- Backend-issued httpOnly guest-session cookie.
- Default 24-hour TTL.
- Missing, malformed, unknown and expired sessions are replaced.
- Reads, transitions and reset operations are scoped by server-resolved guest session.
- Frontend does not receive or send a guest-session identifier as application data.
- `/health` is isolated from session/database behavior.

### Shipment read and bootstrap

- `GET /health`.
- `GET /api/session`.
- `POST /api/demo/bootstrap`.
- `GET /api/shipments`.
- `GET /api/shipments/:shipmentId`.
- Three deterministic synthetic shipments:
  - `DEMO-001` → `awaiting_loading`;
  - `DEMO-002` → `in_transit`;
  - `DEMO-003` → `completed`.
- Bootstrap is transactional, idempotent and concurrent-safe.
- Shipment list/detail and events are guest-session scoped.
- Event histories are contiguous and deterministically ordered.

### Workflow transition API

- `POST /api/shipments/:shipmentId/actions`.
- Client sends only exact domain `action` and `actorRole`.
- Client never sends `guestSessionId` or `nextState`.
- Role and current-state validation use the framework-independent domain package.
- Guarded shipment update and append-only event occur in one transaction.
- Controlled errors include invalid request, forbidden role, invalid transition, not found, conflict and unavailable.
- Concurrent requests cannot both apply the same expected-state transition.
- Supported demo transitions currently exposed by the frontend:
  - `draft → ready_for_dispatch` via `prepareDispatch` / `dispatcher`;
  - `ready_for_dispatch → awaiting_loading` via `dispatch` / `dispatcher`;
  - `awaiting_loading → loading` via `markVehicleArrived` / `warehouse`;
  - `loading → in_transit` via `completeLoading` / `warehouse`;
  - `draft → cancelled` via confirmed `cancel` / `dispatcher`.

### Controlled demo reset

- `POST /api/demo/reset`.
- Request has no application payload.
- Guest session is derived only from the existing server-issued cookie.
- Dedicated `DemoResetService` owns orchestration.
- The whole reset runs in one PostgreSQL transaction.
- Same-session reset requests are serialized through `pg_advisory_xact_lock`.
- Only current-session shipment events and shipments are deleted.
- The existing deterministic bootstrap definitions are reused.
- Exact post-reset dataset:
  - `DEMO-001` → `awaiting_loading`;
  - `DEMO-002` → `in_transit`;
  - `DEMO-003` → `completed`.
- Coherent event histories are recreated from the accepted bootstrap definitions.
- Controlled persistence/service failure response: `demo_reset_unavailable`.
- Repeated and concurrent reset requests do not create duplicate shipments or event chains.
- Reset of one session does not alter another session.

### Frontend workflow and reset behavior

- Russian operational workspace with same-origin typed API client.
- Initialization remains health → session → bootstrap → list → deterministic selection → detail.
- Default selection prefers `DEMO-001`.
- Action availability is derived from server-returned shipment state.
- `DEMO-001` supports `awaiting_loading → loading → in_transit`.
- Draft state presents prepare-dispatch and confirmed destructive cancellation.
- Workflow progress renders the accepted happy path without pretending unsupported states are linear.
- `completed`, `cancelled` and `attention_required` are separate terminal/branch presentations.
- No optimistic workflow or reset mutation.
- Reset requires explicit confirmation.
- Reset and workflow transitions mutually exclude each other in UI controls and immediate handler guards.
- Shipment switching and conflicting controls are disabled while transition or reset is pending.
- After successful reset, the frontend fetches list and detail first, then applies one complete workspace snapshot.
- `DEMO-001` is selected after reset when present.
- If post-reset list or detail refresh fails, the latest complete valid list, selection, detail, action and timeline remain visible.
- A detail request started before reset cannot overwrite the accepted post-reset snapshot.
- Controlled errors restore a usable phase and do not leak rejected promises.

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

When detail is displayed:

```text
selectedShipmentId === detail.shipment.id
```

Stale normal-detail, transition-refresh, conflict-refresh and pre-reset detail requests must not violate this invariant.

After any completed or failed transition/reset flow, the interface must not remain stuck in `transitioning` or `resetting`.

## Testing state

Accepted coverage includes:

- workflow domain transitions and denials;
- persistence repositories and transaction behavior;
- guest-session lifecycle and cross-session isolation;
- bootstrap coherence and concurrency;
- shipment list/detail API;
- transition success, forbidden access, invalid transition, session isolation and concurrency conflict;
- frontend API credentials and relative endpoints;
- response validation and safe request payloads;
- transition payload limited to `action` and `actorRole`;
- reset request without client-selected session or state data;
- initialization and deterministic `DEMO-001` selection;
- Russian presentation labels and synthetic-data disclaimer;
- sequential second action and refreshed action availability;
- workflow progress and terminal/exception presentation;
- confirmed cancellation;
- transition and reset double-submit protection;
- reset confirmation and cancellation;
- exact reset restoration of all three deterministic shipments;
- removal of pre-reset transition/cancellation history;
- coherent recreated event chains;
- repeated and concurrent reset safety;
- reset isolation between guest sessions;
- controlled reset failure mapping;
- atomic post-reset list/detail snapshot application;
- preservation of the previous complete UI snapshot when post-reset detail refresh fails;
- stale pre-reset detail protection;
- restoration of list, action and reset interaction after failures.

Latest accepted CI for Stage 10: run #32, successful.

Known CI issue to address deliberately:

- an existing transition concurrency integration test can receive `invalid_transition` instead of `transition_conflict` depending on whether the losing request validates before or after the winning transaction commits;
- both outcomes preserve the invariant that only one transition is applied;
- the assertion should be stabilized without weakening backend guarantees.

## Next controlled stage — Stage 11

Introduce guest-session quotas and basic public abuse controls before exposing the demo publicly.

Before implementation, inspect the current guest-session schema, transition/reset transaction boundaries, Fastify plugin setup, production proxy assumptions and error-envelope conventions.

Stage 11 should:

- define explicit server-side per-session limits for workflow transitions and reset requests;
- decide whether shipment/event limits are fixed invariants of the deterministic dataset or separately counted resources;
- enforce limits atomically so concurrent requests cannot bypass them;
- preserve bootstrap, transition, reset and cross-session isolation behavior;
- add stable controlled API errors for exhausted quotas;
- add minimal public rate limiting at an appropriate HTTP boundary;
- avoid trusting browser-provided counters, session identifiers or limit data;
- preserve the current deterministic reset capability;
- add clear Russian frontend error messages and recovery behavior;
- add PostgreSQL-backed integration tests for exhaustion, isolation, concurrency and reset interaction;
- keep configuration explicit and suitable for later production tuning.

Stage 11 should not yet implement:

- authentication or production RBAC;
- billing or plans;
- a generic quota-management platform;
- distributed rate limiting infrastructure unless the accepted deployment topology requires it;
- analytics dashboards;
- attachments, PDF or signatures;
- real operator integration;
- production deployment;
- marketing landing page changes.

## Near-term stage order

After Stage 11, likely controlled steps are:

1. stabilization of concurrency CI semantics if not handled during Stage 11;
2. final UX/accessibility and browser-level happy-path audit;
3. production Compose/Nginx hardening;
4. deployment and smoke/security audit;
5. portfolio presentation and public documentation.

## Delivery estimate

After Stage 10:

- technical demo MVP: approximately 78–84% complete;
- credible public portfolio demo: approximately 64–72% complete;
- working public demo MVP: roughly 2–3 focused working days if scope remains controlled;
- polished portfolio release: roughly 4–7 focused working days;
- real customer pilot is a separate 3–6 week effort depending on authentication, integrations and operational requirements.

## Agent workflow rules

- GPT owns product direction, architecture review, scope and documentation.
- Codex prompts are written in Russian.
- File names, paths, components, variables and technical entities remain exactly as used in the codebase.
- Codex changes code and approved technical configuration only.
- Codex must not edit documentation or Project Brain unless explicitly authorized.
- Codex must not commit, push or deploy.
- The owner commits and pushes approved stage changes.
- GPT creates and reviews PRs and performs available GitHub operations.
- Merge requires explicit owner authorization.
- After GPT updates `main`, the owner synchronizes with `git pull --ff-only origin main` before creating the next stage branch.

## Active risks

- accidental positioning as an accredited operator;
- TMS scope expansion;
- public abuse before quotas/rate limiting;
- counters that can be bypassed by concurrency;
- reset quota semantics that make the demo unusable;
- rate limiting that blocks normal demo use behind a shared proxy;
- cross-session quota leakage;
- stale frontend data after controlled errors;
- flaky concurrency assertion producing unreliable CI signals;
- premature real-integration claims.

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
