# ETRN Flow — Handoff

## Current state

- Private GitHub repository: `stalar78/etrn-flow-demo`.
- Stages 03–08 are accepted and merged into `main`.
- Latest accepted product-code merge: Stage 08, commit `b2a24bd4c305f305e2ac86958ef45ff2480836bd`.
- `PROJECT_BLUEPRINT.md` was synchronized after Stage 08 in commit `8bed4adcb70df26891b422771baeda38c28c2490`.
- Current next stage: Stage 09 sequential workflow demo.

## Current stage

`First frontend vertical slice accepted → Sequential multi-step workflow demo next`

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
- Accepted Stage 07 demo transition:
  - `markVehicleArrived`;
  - role `warehouse`;
  - `awaiting_loading → loading`.

### Frontend vertical slice

- Russian operational workspace replaces the technical placeholder.
- Same-origin typed API client uses relative URLs and `credentials: "same-origin"`.
- Initialization sequence:
  - health;
  - session;
  - bootstrap;
  - shipment list;
  - deterministic selection;
  - shipment detail.
- Default selection prefers `DEMO-001`.
- UI includes:
  - product header and API status;
  - persistent synthetic-data disclaimer;
  - shipment list;
  - shipment detail;
  - workflow action panel;
  - ordered event timeline;
  - controlled loading, error, retry and success states.
- State, role, action and event labels are mapped to Russian presentation labels.
- After transition, list and detail reload from the server.
- No optimistic state mutation.
- Shipment switching is disabled while a transition is pending.
- Request-version and selection guards prevent stale detail or transition refresh from overwriting the current selection.
- Timeline is hidden defensively when detail does not match the selected shipment.

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
- transition refresh;
- initialization retry;
- normal stale-detail protection;
- stale success/conflict transition-refresh protection;
- restoration of list interaction after transition.

Latest accepted CI run for Stage 08 correction: run #23, successful.

## Next controlled stage — Stage 09

Extend the demo from one isolated action into a short sequential workflow journey using only domain transitions that already exist.

Before implementation, inspect the exact current domain transition table and backend contracts. Do not infer missing transitions.

Stage 09 should:

- expose additional already-supported workflow actions in the frontend;
- map each supported action to its exact required actor role;
- allow the user to advance a selected synthetic shipment through several consecutive states;
- update list, detail, available actions and timeline after each server-confirmed transition;
- preserve guest-session scoping, guarded persistence and append-only events;
- preserve all stale-response protections;
- add focused tests for sequential execution and action availability;
- remain narrow and avoid a generic workflow engine.

Stage 09 should not yet implement:

- reset endpoint;
- session quotas or rate limiting;
- shipment creation;
- arbitrary editing;
- role-switching controls beyond the explicit action presentation;
- search, filters, dashboard analytics or charts;
- attachments, PDF or signatures;
- real operator integration;
- production deployment;
- marketing landing page changes.

## Near-term stage order

After Stage 09, likely controlled steps are:

1. repeatable demo reset/restart;
2. guest-session quotas and public abuse controls;
3. final UX/accessibility and browser-level happy-path audit;
4. production Compose/Nginx hardening;
5. deployment and smoke/security audit;
6. portfolio presentation and public documentation.

## Delivery estimate

After Stage 08:

- technical demo MVP: approximately 65–70% complete;
- credible public portfolio demo: approximately 50–60% complete;
- working public demo MVP: roughly 3–5 focused working days if scope remains controlled;
- polished portfolio release: roughly 6–10 focused working days;
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
- exposing actions not supported by the domain;
- bypassing role/state validation;
- stale frontend data after sequential transitions;
- demo exhaustion without a controlled reset;
- public abuse before quotas/rate limiting;
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
