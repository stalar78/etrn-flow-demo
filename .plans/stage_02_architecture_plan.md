# Stage 02 — Accepted Architecture Plan

Status: accepted on 2026-08-02.

## Goal

Define the minimum sustainable full-stack architecture for the public ETRN Flow demo and identify the first implementation slice.

## Accepted decisions

- Architecture: modular monolith in one repository.
- Repository layout: workspace structure with `apps/`, `packages/` and `infra/`.
- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Database: PostgreSQL.
- Data access: Drizzle ORM.
- Validation: Zod.
- Deployment: Docker Compose on one VPS behind Nginx.
- Real EPD operator integration: excluded from MVP.
- Integration design: replaceable adapter boundary with mock success, controlled failure and retry.
- Demo access: isolated guest session with httpOnly cookie, quotas, reset and cleanup.
- Recommended guest-session TTL: 24 hours.
- Workflow: explicit state machine and named role actions; no direct status editing.
- Production deployment: manual only during the first release cycle.

## Domain priorities

The first implementation must focus on:

- `GuestSession`;
- `Shipment` aggregate;
- fixed `WorkflowState` transitions;
- role-gated actions;
- append-only `Event` history;
- seeded synthetic data.

Organizations, drivers, vehicles, cargo and demo documents should initially contain only fields required by the vertical slice. No generic workflow engine or broad TMS model is allowed.

## First vertical slice

The accepted first slice is:

1. scaffold workspace and real developer commands;
2. start React web and Fastify API locally;
3. create or resolve an isolated guest session;
4. seed one synthetic shipment;
5. expose shipment detail through the API;
6. render the shipment in the web app;
7. execute one valid transition, initially `markVehicleArrived` or an equivalent approved action;
8. persist the new state;
9. append an event;
10. refresh the UI status and event log.

The slice must not include the complete dashboard, shipment wizard, role suite, attention center or production deployment.

## Stage sequence

1. Foundation and workspace tooling.
2. Domain workflow and transition tests.
3. Guest session, seed data and persistence.
4. First end-to-end vertical slice.
5. Dispatcher shipment list and detail.
6. Demo role switching and driver mobile flow.
7. Delay, discrepancy and attention scenarios.
8. Mock operator adapter failure/retry flow.
9. Shipment creation wizard and quotas.
10. Analytics, CTA, security hardening and deployment.

Each stage is reviewed before the next one starts.

## Required checks before first deployment

- lint;
- typecheck;
- unit tests for workflow transitions and role actions;
- API integration tests for guest session, shipment read, transition, event append and reset;
- key frontend component tests;
- one end-to-end happy path;
- production build;
- security review of cookies, CORS, headers, rate limits, logs and secrets.

## Delivery estimate

- Foundation: 4–6 working days.
- First vertical slice after foundation: 3–5 working days.
- Minimum public MVP after foundation: 18–26 working days.
- Hardening and deployment: 5–8 working days.
- Overall estimate remains 5–7 calendar weeks, provided the scope does not expand toward a full TMS or real EPD integration.

## First Build-stage boundary

Codex may create code and technical configuration only. Project documentation remains maintained by GPT through GitHub.

Expected technical scope:

- root workspace configuration;
- web and API skeletons;
- shared and domain packages;
- real scripts and Makefile targets;
- health route;
- initial workflow model and tests;
- local Docker Compose/PostgreSQL foundation where justified by the approved Build prompt;
- `.env.example` without secrets;
- CI without automatic production deployment.

## Governance

- Codex prompts are written in English.
- Codex must not modify `docs/`, `.business/`, `.idea/`, `.architecture/`, `.architect/`, `.plans/`, `.retrospectives/`, `.security/`, `PROJECT_BLUEPRINT.md`, `AGENTS.md` or documentation sections of `README.md` unless explicitly authorized for a narrow technical reason.
- GPT maintains documentation directly in GitHub.
- No commit, push or deploy by Codex unless separately authorized.
