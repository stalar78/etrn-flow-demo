# ETRN Flow — Handoff

## Current state

- Private GitHub repository is active: `stalar78/etrn-flow-demo`.
- Documentation structure is normalized.
- Product requirements and Project Brain are committed.
- Architecture Plan was completed by Codex in read-only Plan mode and accepted by GPT.
- No application code has been accepted yet.
- Current documentation head after architecture acceptance is on `main`.

## Current stage

`Architecture accepted → First Build stage pending`

## Accepted architecture

- Modular monolith in one repository.
- Workspace layout with `apps/`, `packages/` and `infra/`.
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Database: PostgreSQL.
- Data access: Drizzle ORM.
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

## Guest session model

- Entry without registration.
- Backend-issued httpOnly cookie.
- Strict session scoping for all data.
- Recommended TTL: 24 hours.
- Quotas, reset and expired-session cleanup.
- Demo role switching is not production RBAC.

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

## First vertical slice

The first complete slice after foundation must prove:

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

## Immediate next step

Prepare an English Codex Build prompt for the technical foundation only.

The foundation should establish:

- workspace configuration;
- web and API skeletons;
- shared/domain packages;
- real package scripts and Makefile targets;
- lint, typecheck, tests and build;
- health route;
- initial workflow model and tests;
- environment example without secrets;
- CI without automatic production deployment;
- local PostgreSQL/Docker foundation only where required by the accepted scope.

It must not implement the whole MVP.

## Agent workflow rules

- GPT maintains all project documentation directly through GitHub.
- Codex prompts are written in English.
- Codex works on code and approved technical configuration only.
- Codex must not modify documentation or Project Brain unless explicitly authorized.
- Codex must not commit, push or deploy unless separately authorized.
- The owner pulls GPT documentation commits locally with `git pull --ff-only origin main`.

## Delivery estimate

- Foundation: 4–6 working days.
- First vertical slice: 3–5 working days after foundation.
- Minimum public MVP: 18–26 working days after foundation.
- Hardening and deployment: 5–8 working days.
- Overall target: 5–7 calendar weeks if scope remains controlled.

## Active risks

- accidental positioning as an accredited operator;
- excessive scope and TMS overbuilding;
- a static-looking demo without credible state changes;
- guest-session abuse;
- unverified legal wording;
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
