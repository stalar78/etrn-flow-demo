# ETRN Flow — Handoff

## Current state

- Private GitHub repository is active: `stalar78/etrn-flow-demo`.
- Product requirements, architecture and Project Brain are committed.
- PR #1, `Stage 03: scaffold ETRN Flow foundation`, was reviewed, corrected and squash-merged into `main`.
- Accepted foundation merge commit: `cc8474083a4816f23fedc3c2aba486277f3eb923`.
- Post-merge documentation update started on `main`.
- Application foundation is accepted; persistence has not been implemented yet.

## Current stage

`Foundation accepted → Persistence foundation next`

## Accepted technical foundation

- pnpm workspace with `apps/`, `packages/` and `infra/` boundaries.
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Shared package with Zod health schema, demo roles and workflow states.
- Framework-independent shipment workflow package with role/state validation and tests.
- Fastify `/health` endpoint.
- Local PostgreSQL Compose service bound to localhost.
- Makefile wrappers for install, dev, checks and database lifecycle.
- GitHub Actions CI for install, lint, typecheck, tests and build.
- Workspace packages emit runnable ESM JavaScript and declarations to `dist`.
- Development and tests resolve shared source explicitly without depending on stale build artifacts.
- Plain-Node API runtime was smoke-tested after production build.

## Accepted architecture

- Modular monolith in one repository.
- Database: PostgreSQL.
- Data access: Drizzle ORM when persistence begins.
- Validation: Zod.
- Deployment target: Docker Compose on one VPS behind Nginx.
- Integration: mock adapter only in MVP; future real operators attach through a replaceable adapter boundary.

## Accepted product direction

- Public interactive demo, not a legal EPD platform.
- No real operator, GIS EPD, signatures, MChD, documents or personal data in MVP.
- Synthetic data only.
- Separate commercial page on StalarVision and separate demo subdomain.
- Minimal credible release first; modernization continues after deployment.
- Do not expand into a full TMS.

## Workflow rule

Shipment status cannot be edited directly.

Every change follows:

```text
named action
→ request validation
→ role validation
→ current-state validation
→ transition
→ persistence
→ append-only event
→ UI refresh
```

## Next controlled stage

The next stage is persistence foundation only.

It should establish:

- Drizzle ORM and PostgreSQL driver;
- minimal schemas for guest sessions, shipments and append-only shipment events;
- first migration and migration command;
- repository interfaces separated from PostgreSQL implementations;
- deterministic persistence integration tests against PostgreSQL;
- explicit database configuration validation;
- no HTTP guest-session lifecycle yet;
- no seeded demo workspace yet;
- no reset endpoint;
- no shipment product API or product UI.

This stage should remain narrow so the following stage can build the guest-session and seeded vertical slice on proven persistence.

## First vertical slice after persistence

The first complete product slice must prove:

1. web and API run locally;
2. guest session is created or resolved;
3. one synthetic shipment is seeded;
4. shipment detail is returned through the API;
5. the web app renders it;
6. one allowed action is executed;
7. the backend validates role and state;
8. shipment state changes;
9. an event is appended;
10. UI status and event history update.

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
- persistence coupled directly to Fastify handlers;
- mutable or deletable event history instead of append-only events;
- weak guest-session isolation in the later stage;
- tests passing only because of stale local build artifacts;
- premature UI polish before the vertical slice works;
- unnecessary framework or infrastructure complexity.

## Documents to read first in a new chat

1. `PROJECT_BLUEPRINT.md`
2. `AGENTS.md`
3. `README.md`
4. `.plans/stage_02_architecture_plan.md`
5. `docs/PRODUCT_REQUIREMENTS.md`
6. `docs/SECURITY_POLICY.md`
7. `docs/HANDOFF.md`
