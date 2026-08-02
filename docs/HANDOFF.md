# ETRN Flow — Handoff

## Current state

- Private GitHub repository: `stalar78/etrn-flow-demo`.
- Stages 03–09 are accepted and merged into `main`.
- Latest accepted product-code merge: Stage 09, commit `1b70452edb4e5305955d80409dc655a5e1d18702`.
- `PROJECT_BLUEPRINT.md` was synchronized after Stage 09 in commit `e874dfb936b4384ac831021b9f8763d140a52dff`.
- Current next stage: Stage 10 controlled demo reset/restart.

## Current stage

`Sequential workflow demo accepted → Repeatable reset/restart next`

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
- Reads and transitions are scoped by server-resolved guest session.
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

### Sequential frontend workflow demo

- Russian operational workspace with same-origin typed API client.
- Initialization sequence remains health → session → bootstrap → list → deterministic selection → detail.
- Default selection prefers `DEMO-001`.
- Action availability is derived from the current server-returned shipment state.
- `DEMO-001` supports the accepted sequential path:
  - `awaiting_loading → loading → in_transit`.
- The previous action disappears only after server-confirmed refresh.
- Draft state presents prepare-dispatch and confirmed destructive cancellation.
- Workflow progress renders the accepted happy path without pretending unsupported states are linear.
- `completed`, `cancelled` and `attention_required` are presented separately as terminal/branch states.
- No optimistic state mutation.
- Double-submit is guarded both by React phase and an immediate in-flight ref.
- Shipment switching is disabled while a transition is pending.
- Conflict and invalid-transition responses trigger a controlled refresh.
- A failure of that recovery refresh exits `transitioning`, restores controls and shows a controlled Russian error.
- Abort after entering `transitioning` also restores a usable phase.
- Request-version and selection guards prevent stale detail or transition refresh from overwriting the current selection.
- Timeline remains hidden defensively when detail does not match the selected shipment.

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

Direct status assignment through an API or frontend is forbidden.

## Current frontend invariant

When detail is displayed:

```text
selectedShipmentId === detail.shipment.id
```

Stale normal-detail requests, transition refreshes and conflict refreshes must not violate this invariant.

After any non-abort transition completion, the interface must not remain in `phase === "transitioning"`.

## Testing state

Accepted coverage includes:

- workflow domain transitions and denials;
- persistence repositories and transaction behavior;
- guest-session lifecycle and cross-session isolation;
- bootstrap coherence and concurrency;
- shipment list/detail API;
- transition success, forbidden access, invalid transition, session isolation and concurrency conflict;
- frontend API credentials and relative endpoints;
- response validation and controlled API errors;
- transition payload limited to `action` and `actorRole`;
- initialization and deterministic `DEMO-001` selection;
- Russian presentation labels and synthetic-data disclaimer;
- event ordering;
- sequential second action and refreshed action availability;
- workflow progress and terminal/exception presentation;
- confirmed cancellation;
- double-submit protection;
- initialization retry;
- normal stale-detail protection;
- stale success/conflict transition-refresh protection;
- conflict and invalid-transition recovery-refresh failure handling;
- restoration of list and action interaction after transition failures.

Latest accepted CI for Stage 09: run #28, successful after rerunning one flaky concurrency integration assertion.

Known CI issue to address separately:

- the existing concurrency integration test sometimes receives `invalid_transition` instead of `transition_conflict` depending on whether the losing request validates before or after the winning transaction commits;
- both outcomes preserve the core invariant that only one transition is applied;
- the test should be stabilized deliberately without weakening backend guarantees.

## Next controlled stage — Stage 10

Add a repeatable demo reset/restart flow so a visitor can restore the deterministic scenario after advancing or cancelling shipments.

Before implementation, inspect the current bootstrap service, repositories, transaction boundaries, event schema and frontend stale-request protections. Do not implement reset as direct status editing.

Stage 10 should:

- define exact reset semantics for the current guest session;
- restore the deterministic three-shipment dataset and coherent histories;
- remain server-controlled and transactionally safe;
- be idempotent and safe under concurrent reset requests;
- preserve guest-session isolation;
- avoid accepting arbitrary shipment states, references, event payloads or seed data from the browser;
- provide a clear frontend reset control with explicit confirmation;
- disable conflicting interactions while reset is in flight;
- refresh list, deterministic selection, detail, actions, progress and timeline after success;
- preserve current UI state and restore controls on failure;
- preserve request-version and selection invariants;
- add focused backend integration and frontend tests.

Stage 10 should not yet implement:

- session quotas or public rate limiting;
- expired-session cleanup jobs;
- shipment creation or arbitrary editing;
- search, filters, dashboard analytics or charts;
- attachments, PDF or signatures;
- real operator integration;
- production deployment;
- marketing landing page changes.

## Near-term stage order

After Stage 10, likely controlled steps are:

1. guest-session quotas and public abuse controls;
2. stabilization of concurrency CI semantics if not handled sooner;
3. final UX/accessibility and browser-level happy-path audit;
4. production Compose/Nginx hardening;
5. deployment and smoke/security audit;
6. portfolio presentation and public documentation.

## Delivery estimate

After Stage 09:

- technical demo MVP: approximately 72–78% complete;
- credible public portfolio demo: approximately 58–65% complete;
- working public demo MVP: roughly 2–4 focused working days if scope remains controlled;
- polished portfolio release: roughly 5–8 focused working days;
- real customer pilot is a separate 3–6 week effort depending on authentication, integrations and operational requirements.

## Agent workflow rules

- GPT owns product direction, architecture review, scope and documentation.
- Codex prompts are written in English.
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
- reset implemented as arbitrary state mutation;
- reset breaking event-chain coherence;
- cross-session reset leakage;
- stale frontend data after reset;
- demo exhaustion without a controlled reset;
- public abuse before quotas/rate limiting;
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
