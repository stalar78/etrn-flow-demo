# ETRN Flow — Handoff

## Current state

- Private GitHub repository: `stalar78/etrn-flow-demo`.
- Stages 03–15D, Stage 16A–16C, Stage 16 Initial Production Launch, Stage 17A–17D, Stage 18A and Stage 18B.1 are accepted.
- Stage 12B accepted merge commit: `a1e829ebbd695abc19078362d33a04ffd2b68c15`.
- Stage 13A accepted merge commit: `1a01396c63fe8523058aa938f47d8f7bc7cd3132`.
- Stage 14B accepted merge commit: `71a586aab08044c42b8c07f68e0a02cd2529e2e3`.
- Stage 15B accepted merge commit: `b4868f17563b256b4ca1973f11390f02ac46a942`.
- Stage 15C accepted product-code merge commit: `4ae57a70c1c1e0f5ef5455f4208e00a54870ab69`.
- Stage 15D was evidence-only and made no application-code, schema, Docker/Compose or dependency changes.
- Stage 16A accepted merge commit: `5eefbc611c3ac3e0d5bdd3cffa49b1cdaf3b80c3`; production web loopback binding is `127.0.0.1:8083`.
- Stage 16B accepted merge commit: `c4e3ffbed9cf0f05c7c849755823e13a2ad605d6`; dev-tooling security maintenance was accepted before deployment.
- Stage 16C accepted merge commit: `81a69da562bfe112584f353f1638f2443af3481a`; post-launch dependency advisory remediation is accepted and CI #74 is successful.
- Stage 17A Guided Demo Experience accepted merge commit: `43ea64c64e9f2daccdf33f477283c27b4fcad25b`.
- Stage 17B Complete Transport Lifecycle accepted merge commit: `30aa5edb39b773f558a9f651e73e25aee72e9211`; CI #81 is successful.
- Stage 17C Managed Attention Scenario accepted merge commit: `e1224a823c409749b29ec925aa5245e09c5dfd67`; CI #85 is successful.
- Stage 17D Commercial Conversion Layer accepted merge commit: `2bc824144674d885a6619f8ec7e596b74e81ffd3`; CI #87 is successful.
- Stage 16C + Stage 17A–17D controlled production release was accepted on 2026-08-08 after external smoke.
- Favicon update accepted merge commit: `90a8f81867f6bf1c0d6190ee91176e7b81793d25`; CI #91 is successful and the favicon is deployed.
- Stage 18A.1 Scenario Orientation Polish accepted merge commit: `cf0f6b607a91269d4c87069536cccebd5905849f`; CI #95 is successful.
- Stage 18A.2 Scenario Discoverability in Shipment List accepted merge commit: `79491515f3e97222e1343023ae8bab83e86e6935`; CI #97 is successful.
- Stage 18A web-only production update was accepted on 2026-08-08 after web health and production bundle smoke.
- Stage 18B.1 Operational Snapshot accepted merge commit: `854c2ac22cdd24e3dd8a8c3e95fb781f35b96c22`; CI #101 is successful.
- Stage 18B.1 web-only production update was accepted on 2026-08-08 after web health, public health and production bundle smoke.
- Public production demo is live at `https://etrn.stalarvision.ru` and exposes the accepted Stage 18B.1 behavior.
- Current production/repository checkout baseline: `854c2ac22cdd24e3dd8a8c3e95fb781f35b96c22` (`feat: add operational demo snapshot (#37)`).
- Initial production backup/restore and off-VPS recovery-copy verification passed.
- Pre-release backup for the 2026-08-08 Stage 16C + Stage 17A–17D rollout: `/home/stanislav/backups/etrn-flow/etrn-flow-20260808T131846Z.dump`, observed size `28528` bytes, readable as a PostgreSQL custom archive.

## Current stage

`Browser E2E accepted → Production container baseline accepted → Guided product presentation accepted → Guest-session lifecycle hardening accepted → Repository security hardening accepted → Local release rehearsal accepted → Stage 16A host-port isolation accepted → Stage 16B dev-tooling security maintenance accepted → Stage 16 Initial Production Launch accepted → Stage 16C post-launch dependency security accepted → Stage 17A Guided Demo Experience accepted → Stage 17B Complete Transport Lifecycle accepted → Stage 17C Managed Attention Scenario accepted → Stage 17D Commercial Conversion Layer accepted → controlled production release accepted → favicon maintenance accepted → Stage 18A UX Scenario Orientation & Discoverability accepted and deployed → Stage 18B.1 Operational Snapshot accepted and deployed → documentation sync`

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
- CI covers install, production dependency audit, lint, typecheck, tests, migrations, PostgreSQL integration tests, build, Chromium E2E, full-history secret scan and production-stack smoke.

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
- Default public-demo limits: 60 mutations, 8 resets, 8 protected POST requests per 10-second burst window.
- The Stage 17B burst default allows bootstrap plus the six-action full `DEMO-001` lifecycle without a test-only bypass.
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

### Public-release repository hardening — Stage 15C

Accepted controls:

- `drizzle-orm` upgraded to `^0.45.2`;
- CI production dependency gate: `pnpm audit --prod --audit-level high`;
- full-history Gitleaks scan pinned to immutable action SHA;
- Gitleaks job has minimal `contents: read` and `pull-requests: read` permissions;
- reusable `infra/nginx/security-headers.conf`;
- strict CSP without `unsafe-inline`, `unsafe-eval`, wildcards, `data:` or `blob:`;
- Nginx child locations that define `Cache-Control` explicitly include the shared security-header snippet;
- production response-header smoke covers `/`, `/index.html`, a built asset, `/health` and `/api/session`;
- exact CSP is asserted in CI.

### Local release and backup/restore rehearsal — Stage 15D

Stage 15D used the accepted production Compose and a temporary synthetic environment. No repository code/config changes were required.

Accepted evidence:

- production Compose config validated with a complete synthetic production-like env;
- production images built successfully;
- clean PostgreSQL initialization and migrations passed;
- `postgres`, `api` and `web` reached healthy state;
- `/health` and same-origin API calls passed through the web/Nginx boundary with production security headers;
- Secure/HttpOnly/SameSite guest-session cookie was issued and persisted in the rehearsal client;
- bootstrap created deterministic `DEMO-001`, `DEMO-002`, `DEMO-003` data;
- logical PostgreSQL backup was created with `pg_dump -Fc` and copied outside the container;
- backup restored successfully with `pg_restore` into a separate synthetic DB;
- restored snapshot reproduced the pre-reset shipment UUIDs/states, 1 guest session, 3 shipments, 14 shipment events, 1 usage-limit row and 3 Drizzle migration records;
- restart of `api` and `web` kept PostgreSQL state intact;
- temporary rehearsal stack, backup file, cookie jar, env file and volume were removed after acceptance.

Operational lessons:

- `POSTGRES_PASSWORD` and the password embedded in `DATABASE_URL` must be consistent;
- changing `POSTGRES_PASSWORD` after an existing PostgreSQL data directory was initialized does not rewrite the stored DB password;
- a clean target DB/volume is required for a clean initialization rehearsal;
- Compose `-p` isolates the named volume generated from the volume key, but explicit `container_name` and explicit network name still prevent complete parallel isolation.

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
- Accepted interactive `DEMO-001` transitions are:
  - `markVehicleArrived`: `awaiting_loading → loading`, role `warehouse`;
  - `completeLoading`: `loading → in_transit`, role `warehouse`;
  - `arriveForUnloading`: `in_transit → awaiting_unloading`, role `driver`;
  - `startUnloading`: `awaiting_unloading → unloading`, role `consignee`;
  - `completeUnloading`: `unloading → awaiting_confirmation`, role `consignee`;
  - `completeShipment`: `awaiting_confirmation → completed`, role `consignee`.
- Accepted `DEMO-002` attention branch is:
  - `reportAttention`: `in_transit → attention_required`, role `driver`;
  - `resolveAttention`: `attention_required → in_transit`, role `manager`;
  - after recovery, the existing normal lifecycle can continue through `arriveForUnloading`.
- `attention_required` is a branch state, not a terminal state.
- `completed` and `cancelled` remain terminal.

### Controlled demo reset

- Reset derives session only from the server-issued cookie.
- `DemoResetService` owns orchestration.
- Reset runs in one PostgreSQL transaction.
- Same-session reset requests are serialized through `pg_advisory_xact_lock`.
- Only current-session shipment events and shipments are deleted.
- The deterministic bootstrap definitions are reused.
- Repeated and concurrent resets do not create duplicate shipments or event chains.
- Reset of one session does not alter another session.
- Reset restores `DEMO-001` to `awaiting_loading`, `DEMO-002` to `in_transit` and `DEMO-003` to `completed` with deterministic histories.

### Frontend workflow — Stage 17A–18B.1

- Russian operational workspace with same-origin typed API client.
- Initialization remains health → session → bootstrap → list → deterministic selection → detail.
- Default selection prefers `DEMO-001`.
- Action availability is derived from server-returned state.
- Main demo path: `awaiting_loading → loading → in_transit → awaiting_unloading → unloading → awaiting_confirmation → completed`.
- Stage 17A added `GuidedDemoPath`, derived from selected shipment reference/state without introducing separate workflow state.
- Guided phases are compact: arrival/loading, transport, unloading, completion.
- Stage 17C made `DEMO-002` an interactive prepared example for controlled attention/recovery; `DEMO-003` remains a completed reference example.
- `WorkflowProgress` represents the full domain lifecycle; `GuidedDemoPath` explains the visitor path.
- No optimistic workflow or reset mutation.
- Reset requires explicit confirmation.
- Reset and transitions mutually exclude each other in UI controls and immediate handler guards.
- Controlled failures restore a usable phase and preserve the last complete valid snapshot when appropriate.
- Stage 17D added `CommercialNextStep` after the operational workspace.
- The commercial block exposes three discussion directions: workflow, data/existing systems and role-specific interface.
- The single primary CTA is `Обсудить свою задачу` linking to `https://stalarvision.ru`.
- The public presentation remains one-independent-developer positioning and does not claim real customers, outcomes or integrations.
- The production browser tab uses the StalarVision-based `apps/web/public/favicon.png` referenced from `apps/web/index.html`.
- Stage 18A.1 makes the guided heading reflect the selected prepared scenario and explicitly guides `DEMO-002` through `Сообщить о проблеме` and `Подтвердить решение проблемы`.
- Stage 18A.2 adds reference-based descriptors in the shipment list: `Основной путь перевозки`, `Отклонение и восстановление`, `Завершённый пример`.
- Unknown shipment references do not receive invented descriptors.
- Stage 18B.1 adds `OperationalSnapshot`, derived from the existing `shipments` array without separate state or additional API requests.
- Snapshot metrics are limited to total shipments, `attention_required` and `completed`, and update through the existing transition/reset list refresh.

## Production deployment baseline — Stage 16 and accepted 2026-08-08 releases

Accepted topology:

```text
Internet
→ host Nginx + Certbot
→ 127.0.0.1:8083
→ web container with Nginx
   ├─ serves Vite assets
   ├─ proxies /api/* to api:3000
   └─ proxies /health to api:3000
→ api container
→ postgres container
```

Accepted deployment evidence:

- VPS project checkout is isolated under `/home/stanislav/project/etrn-flow`;
- production secret file exists outside Git tracking at `/home/stanislav/project/etrn-flow/.env.production` with mode `600`;
- production Compose config validated successfully;
- PostgreSQL, API and web containers reached healthy state;
- migration service completed with `Exited (0)`;
- only `127.0.0.1:8083:8080` is published for ETRN web;
- direct loopback and host-Nginx health checks returned HTTP 200;
- DNS for `etrn.stalarvision.ru` resolved to the production VPS;
- host Nginx proxies to `127.0.0.1:8083` with required forwarded headers;
- Certbot issued and deployed TLS for `etrn.stalarvision.ru`;
- HTTP redirects to HTTPS;
- `certbot renew --dry-run` succeeded;
- external HTTPS smoke passed for `/`, `/health`, `/api/session`, `/api/demo/bootstrap` and `/api/shipments`;
- Secure/HttpOnly/SameSite=Lax guest cookie was confirmed in production;
- first production `pg_dump -Fc` archive was verified with `pg_restore -l` and restored into a separate temporary database;
- restore verification produced 5 guest sessions, 15 shipments, 70 shipment events and 5 usage-limit rows;
- the temporary restore database was removed after verification;
- daily VPS backup schedule is active at `03:20 UTC` with 7-day retention;
- first verified off-VPS recovery copy was copied to the owner's Windows workstation;
- 2026-08-08 controlled release updated Stage 16C + Stage 17A–17D to production after a readable pre-release backup and successful migration/build gate;
- runtime burst limit is `8` protected POST requests per 10-second window;
- production external smoke proved `DEMO-002` attention branch, manager recovery, continuation to `awaiting_unloading`, reset and final health;
- targeted runtime replacement did not restart PostgreSQL and did not modify host Nginx/Certbot or neighboring projects;
- favicon update advanced production checkout to `90a8f81867f6bf1c0d6190ee91176e7b81793d25` and rebuilt/recreated only the web container;
- Stage 18A web-only update advanced production checkout to `79491515f3e97222e1343023ae8bab83e86e6935`;
- Stage 18A rebuilt/recreated only `etrn-flow-prod-web` with `--no-deps`;
- Stage 18A final web health was `healthy` and its production bundle contained the accepted scenario descriptors/guidance;
- Stage 18B.1 web-only update advanced production checkout to `854c2ac22cdd24e3dd8a8c3e95fb781f35b96c22`;
- Stage 18B.1 rebuilt/recreated only `etrn-flow-prod-web` with `--no-deps`;
- Stage 18B.1 final web health reached `healthy`;
- production bundle `/assets/index-CfgD7lDU.js` contained the operational snapshot heading and all three metric labels;
- public `/health` remained successful;
- API, PostgreSQL, host Nginx, Certbot and neighboring projects were not changed by the Stage 18B.1 release.

Detailed operational paths, backup schedule, restore rules, release evidence and local recovery location are recorded in [`docs/PRODUCTION_OPERATIONS.md`](PRODUCTION_OPERATIONS.md).

### Post-launch dependency security — Stage 16C

Accepted repository maintenance after launch:

- `vite` and `@vitejs/plugin-react` are classified as `devDependencies` in `apps/web/package.json`;
- `pnpm.overrides.postcss` pins `postcss` to `8.5.26`;
- the lockfile resolves `nanoid` to `3.3.18`;
- full local audit and production audit passed;
- CI #74 passed `Checks`, `Security scan` and `Production stack`;
- no application logic, API, schema, Docker/Compose, Nginx, production ports or deployment configuration changed;
- Stage 16C is deployed as part of the accepted 2026-08-08 production release.

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

- workflow domain transitions and denials through `completed`;
- controlled `attention_required` branch/recovery and continuation back into the normal lifecycle;
- correct/wrong roles, wrong source state and terminal behavior;
- persistence repositories and transaction behavior;
- guest-session lifecycle and cross-session isolation;
- expired-session cleanup eligibility, batching, cascade behavior, idempotency and concurrent safety;
- deterministic bootstrap and concurrency;
- shipment list/detail API;
- transition success, denial, isolation and concurrency conflict;
- full `DEMO-001` integration path through `completed` with ordered append-only events;
- `DEMO-002` integration path `in_transit → attention_required → in_transit → awaiting_unloading`;
- controlled reset behavior and cross-session isolation;
- quota/rate-limit exhaustion, rollback and isolation;
- frontend initialization, full action execution path, guided state, attention branch, reset, stale-request guards and recovery;
- prepared-scenario guided headings and `DEMO-002` guidance assertions from Stage 18A.1;
- `DEMO-001`, `DEMO-002`, `DEMO-003` shipment-list descriptor assertions from Stage 18A.2;
- operational snapshot initial values, completed count and `DEMO-002` attention/recovery `0 → 1 → 0` assertions from Stage 18B.1;
- one Chromium E2E happy path through `completed` with reset;
- product intro, synthetic boundary, commercial next step, CTA and first-visit E2E assertions;
- production Compose and same-origin stack smoke;
- production dependency audit and full-history Gitleaks scan;
- exact CSP/security-header response assertions;
- local release startup, backup/restore and runtime restart rehearsal;
- real VPS production startup, HTTPS routing, external API smoke and production backup/restore verification;
- post-launch dependency remediation validated by CI #74;
- Stage 17B full validation confirmed by CI #81;
- Stage 17C full validation confirmed by CI #85;
- Stage 17D full validation confirmed by CI #87;
- favicon repository update validated by CI #91;
- Stage 18A.1 validation confirmed by CI #95;
- Stage 18A.2 validation confirmed by CI #97;
- Stage 18B.1 validation confirmed by CI #101;
- Stage 16C + Stage 17A–17D external production release smoke accepted on 2026-08-08;
- Stage 18A web-only production release health/bundle smoke accepted on 2026-08-08;
- Stage 18B.1 web-only production release health/bundle smoke accepted on 2026-08-08.

Latest repository/product-code CI relevant to the current production checkout: run #101, successful. `Checks`, `Security scan` and `Production stack` all passed.

## Next controlled stage

Stage 17A Guided Demo Experience, Stage 17B Complete Transport Lifecycle, Stage 17C Managed Attention Scenario, Stage 17D Commercial Conversion Layer, Stage 18A UX Scenario Orientation & Discoverability and Stage 18B.1 Operational Snapshot are accepted and deployed in production.

The product now demonstrates a complete guided happy path, controlled exception/recovery, role-aware transitions, append-only history, scenario discoverability, a compact operational overview and a clear commercial next step. The current controlled activity is documentation sync after the Stage 18B.1 production update.

After this documentation sync, the next product stage, if any, should be selected only after reviewing the live demo, operational state and available evidence. There is no real-customer feedback yet, so the next increment must not invent user needs or business results or automatically expand the snapshot into a larger dashboard. Future completed stages still require review/CI and a separate release gate before updating the live production demo.

Rate limiting in the accepted application is guest-session based, not client-IP based. Do not invent an IP-rate-limit requirement unless a later stage explicitly introduces one.

Analytics, authentication/RBAC, real operator integration and broad TMS expansion remain deferred.

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
- stale frontend recovery regressions;
- premature integration or legal-significance claims;
- production secrets or backups being committed accidentally;
- future releases bypassing the accepted review/release gate;
- backup copies existing only on the production VPS if the off-VPS recovery routine is not maintained;
- accidental impact on neighboring ApprovalFlow, QuoteFlow or `elagin-portal` resources during VPS operations.

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
10. `docs/PRODUCTION_OPERATIONS.md`
