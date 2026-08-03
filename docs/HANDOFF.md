# ETRN Flow — Handoff

## Current state

- Private GitHub repository: `stalar78/etrn-flow-demo`.
- Stages 03–12A are accepted and merged into `main`.
- Stage 11 accepted merge commit: `a4652c312d06cdd7be9a28e141fae4c5a2da2557`.
- Stage 12A accepted merge commit: `a14fdb4cf924f77e42dfab181593b2903a6bef73`.
- Latest accepted product-code merge: Stage 12A, commit `a14fdb4cf924f77e42dfab181593b2903a6bef73`.
- Latest accepted CI: run #40, successful.
- Current next stage: Stage 12B browser-level happy path, UX/accessibility and recovery audit.

## Current stage

`Public abuse controls and concurrency semantics accepted → Browser-level UX/accessibility audit next`

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

### Guest-session quotas and public abuse controls

- PostgreSQL-backed `guest_session_usage_limits`.
- Protected POST endpoints:
  - `POST /api/demo/bootstrap`;
  - `POST /api/demo/reset`;
  - `POST /api/shipments/:shipmentId/actions`.
- Burst limiting runs after server-side guest-session resolution.
- Burst accounting runs in a separate short PostgreSQL transaction.
- Lifetime mutation and reset accounting run inside the same business transaction as the mutation.
- Public synthetic-demo defaults:
  - mutation limit: 60;
  - reset limit: 8;
  - burst window: 10 seconds;
  - burst maximum: 6 protected POST requests.
- Controlled errors:
  - `guest_session_rate_limited`;
  - `guest_session_quota_exceeded`;
  - `demo_reset_quota_exceeded`;
  - `guest_session_usage_unavailable`.
- Quota and rate-limit accounting are isolated per guest session.
- Reset does not clear usage counters.
- Read endpoints and `/health` do not spend mutation or reset quota.

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
- Event state chains are coherent and events are deterministically ordered.

### Workflow transition API

- `POST /api/shipments/:shipmentId/actions`.
- Client sends only exact domain `action` and `actorRole`.
- Client never sends `guestSessionId` or `nextState`.
- Role and current-state validation use the framework-independent domain package.
- Guarded shipment update and append-only event occur in one transaction.
- Controlled errors include invalid request, forbidden role, invalid transition, not found, conflict and unavailable.
- Concurrent requests cannot both apply the same expected-state transition.
- For same-state concurrent transition race, the controlled loser may be:
  - `transition_conflict`, if both requests validated the old state before the winner committed;
  - `invalid_transition`, if the loser read the already-updated state after the winner committed.
- `shipment_events.sequence` is a global table sequence:
  - event list values for one shipment must remain strictly increasing and unique;
  - global gaps are allowed;
  - local `+1` must not be required.
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

Protected POST abuse controls must follow:

```text
server-resolved guest session
→ burst accounting in a separate short transaction
→ business transaction
→ lifetime mutation/reset accounting inside the same business transaction as the mutation
→ commit or rollback
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
- quota and rate-limit coverage for burst, lifetime mutation quota, reset quota, rollback and session isolation;
- Stage 12A race contract coverage for same-state concurrent transitions;
- controlled reset failure mapping;
- atomic post-reset list/detail snapshot application;
- preservation of the previous complete UI snapshot when post-reset detail refresh fails;
- stale pre-reset detail protection;
- restoration of list, action and reset interaction after failures.

Latest accepted CI: run #40, successful.

## Next controlled stage — Stage 12B

Browser-level happy path, UX/accessibility and recovery audit.

This is an audit-first stage, not a broad redesign.

Stage 12B should:

- verify the complete browser-level happy path:
  - entry;
  - bootstrap;
  - shipment selection;
  - first transition;
  - second transition;
  - reset;
  - restored deterministic state;
- verify controlled error and recovery paths;
- verify keyboard navigation;
- verify visible focus;
- verify disabled and loading states;
- verify accessible labels and confirmations;
- verify responsive behavior;
- verify synthetic-demo disclaimer visibility;
- verify the absence of stale UI after transition or reset;
- add browser-level tests only for the critical happy path and reset;
- allow only minimal targeted fixes discovered by the audit.

Stage 12B should not include:

- production deployment;
- real integrations;
- authentication or RBAC;
- analytics dashboards;
- redesign;
- marketing landing page work;
- generic accessibility-platform work;
- attachments, PDF or signatures;
- broad component rewrites.

## Near-term stage order

Next likely controlled steps are:

1. browser-level happy path and UX/accessibility audit;
2. production Compose/Nginx and runtime hardening review;
3. deployment and smoke/security audit;
4. portfolio presentation and public documentation;
5. controlled traffic/analytics stage only after the deployment baseline is accepted.

## Delivery estimate

After Stage 12A:

- technical demo MVP: approximately 84–89% complete;
- credible public portfolio demo: approximately 70–78% complete;
- working public demo MVP: roughly 1–2 focused working days if scope remains controlled;
- polished portfolio release: roughly 3–6 focused working days;
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
- abuse-control tuning behind a reverse proxy;
- incorrect client-IP assumptions in later deployment hardening;
- cleanup of expired sessions;
- reset quota semantics that make the demo unusable;
- browser UX/accessibility gaps;
- stale frontend recovery regressions after controlled errors;
- premature integration claims.

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
