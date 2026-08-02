# Architecture Overview

Status: accepted on 2026-08-02 after Codex Plan review.

## Architectural style

ETRN Flow uses a modular monolith in one repository with workspace boundaries:

```text
apps/web
apps/api
packages/shared
packages/domain
infra
```

The first public release is a real full-stack demo, not a static frontend mock.

## Accepted stack

- Frontend: React + TypeScript + Vite.
- Backend: Node.js + TypeScript + Fastify.
- Database: PostgreSQL.
- Data access: Drizzle ORM.
- Validation: Zod schemas shared where practical.
- Deployment: Docker Compose on one VPS behind Nginx.
- External EPD interaction: mock adapter only in MVP.

## High-level system

```text
Browser
→ React web application
→ Fastify API
→ guest-session boundary
→ application services
→ shipment/workflow domain
→ Drizzle persistence
→ PostgreSQL
→ mock operator adapter
```

## Main boundaries

### `apps/web`

Responsible for routing, forms, adaptive UI, API calls, demo-role presentation and product analytics events. It must not contain authoritative workflow transition rules.

### `apps/api`

Responsible for HTTP routes, guest-session resolution, validation, quotas, rate limiting, persistence coordination and adapter calls.

### `packages/domain`

Contains pure shipment state-machine rules, allowed role actions and event-generation rules. It must not depend on HTTP, React or a concrete operator SDK.

### `packages/shared`

Contains shared DTOs, enums, Zod schemas and view-model contracts. It must not become a second domain layer.

### `infra`

Contains Docker Compose and later Nginx/deployment configuration. Production deployment remains manual in the first release.

## Guest-session model

- entry without registration;
- server-created isolated guest workspace;
- httpOnly cookie;
- all mutable records scoped by `guestSessionId`;
- recommended TTL: 24 hours;
- quotas for shipments, events and actions;
- reset recreates the workspace;
- expired sessions are removed by cleanup processing.

Role switching is a demo perspective selector, not production RBAC.

## Workflow invariant

Shipment status cannot be edited directly. Every change must follow this sequence:

```text
validate session
→ validate role
→ validate current state
→ apply named domain action
→ persist state
→ append event
→ recalculate attention state
→ optionally call mock adapter
→ return updated view model
```

## First vertical slice

The first implementation slice must prove the complete chain:

1. run web and API locally;
2. create or resolve a guest session;
3. return one seeded shipment;
4. render shipment detail in the web app;
5. execute one allowed action such as `markVehicleArrived`;
6. validate the role and state in the backend/domain layer;
7. persist the new state and append an event;
8. refresh status and event log in the UI.

## Explicit exclusions

The architecture must not include in the first MVP:

- real operator integration;
- GIS EPD interaction;
- KEP, PEP, MChD or cryptography;
- production customer authentication;
- real personal data or documents;
- generic workflow engine;
- full TMS, GPS, billing or 1C integration;
- native mobile application.

## Main trade-off

The accepted design is intentionally stronger than a frontend-only prototype but lighter than an enterprise NestJS platform. It should demonstrate credible engineering while remaining maintainable by one independent developer.
