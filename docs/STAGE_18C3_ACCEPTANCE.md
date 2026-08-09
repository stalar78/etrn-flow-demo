# Stage 18C.3 — Demo Completion Handoff

## Status

Stage 18C.3 is accepted in the repository and deployed in production.

- Product commit: `7cbd59ca38d1d0124bf1618a19fcd7b6f6613342` (`feat: add demo completion handoff`)
- CI: run #114, successful
- Production release date: 2026-08-09
- Public demo: `https://etrn.stalarvision.ru`
- Production checkout after release: `7cbd59ca38d1d0124bf1618a19fcd7b6f6613342`

## Product change

Stage 18C.3 closes the end-of-scenario UX gap after the main `DEMO-001` path reaches `completed`.

When `DEMO-001` is completed and `DEMO-002` is present in the already loaded shipment collection, `GuidedDemoPath` now exposes the secondary action:

`Посмотреть DEMO-002`

The handoff explains that the normal transport path is complete and offers the prepared `DEMO-002` scenario for exception/recovery review.

The implementation preserves the existing selection architecture:

- `App` resolves `DEMO-002` by `shipment.reference === "DEMO-002"`;
- no internal shipment ID is hardcoded;
- `GuidedDemoPath` receives only a callback for the handoff;
- the callback reuses the existing `handleSelectShipment(...)` flow;
- `GuidedDemoPath` does not call the API directly;
- no separate onboarding/navigation state was introduced;
- no additional API request exists specifically for the handoff;
- if `DEMO-002` is absent, the handoff action is not rendered.

## Accepted implementation scope

Application changes are limited to:

- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/components/GuidedDemoPath.tsx`
- `apps/web/src/styles.css`

No backend, API contract, domain, schema, dependency, Docker/Compose, Nginx or production-configuration change was introduced.

## Test and CI evidence

Local implementation validation reported:

- web tests passed: 45 tests;
- web build passed;
- web typecheck passed;
- root lint passed;
- `git diff --check` passed, with line-ending warnings only.

GitHub CI run #114 completed successfully for product commit `7cbd59ca38d1d0124bf1618a19fcd7b6f6613342`.

Accepted CI jobs:

- `Security scan` — success;
- `Checks` — success;
- `Production stack` — success.

`Checks` included production dependency audit, lint, typecheck, tests, migrations, persistence integration tests, build and Chromium E2E.

`Production stack` included Compose validation, production image build, migrations in the isolated CI stack, stack health, same-origin smoke, response-header smoke and exact host-port exposure verification.

## Production release evidence

The controlled Stage 18C.3 release was performed as a frontend-only update.

Pre-release production checkout:

`098f041bd72826a60ed008f1da7d5b39536b5f3f`

This was the documentation synchronization commit created after the accepted Stage 18C.2 production release. Its Stage 18C.2 product ancestor is `09e7bed392ae57f8cb3f505595daef97b3f2b9e3`.

The pre-release checkout was clean and on `main`. Fast-forward ancestry to the Stage 18C.3 product commit was verified before updating.

Final production checkout:

`7cbd59ca38d1d0124bf1618a19fcd7b6f6613342`

Release operations:

- `git fetch origin main` and `git pull --ff-only origin main` succeeded;
- production Compose configuration validation succeeded;
- only the `web` image was rebuilt;
- only `etrn-flow-prod-web` was force-recreated with `--no-deps`;
- API and PostgreSQL container IDs and `StartedAt` values remained unchanged;
- migrations were not run for this production release;
- `.env.production` was not modified;
- Nginx and Certbot were not modified;
- neighboring projects were not modified;
- no broad Docker cleanup was performed.

Final runtime evidence:

- `etrn-flow-prod-web` — healthy;
- `etrn-flow-prod-api` — healthy and not restarted/recreated;
- `etrn-flow-prod-postgres` — healthy and not restarted/recreated;
- exact web binding remained `127.0.0.1:8083 -> 8080`;
- loopback `/health` returned `{"status":"ok","service":"etrn-flow-api"}`;
- public `/health` returned `{"status":"ok","service":"etrn-flow-api"}`.

Deployed JavaScript asset:

`/assets/index-BVH7VLOJ.js`

The actual production bundle contained the accepted markers:

- `Посмотреть DEMO-002`;
- `Основной путь завершён`;
- `Новый статус:`.

The final marker confirms that the previously accepted Stage 18C.2 transition-feedback behavior remained present after the Stage 18C.3 web-only release.

## Warnings observed during release

A Compose Bake/buildx warning was emitted during the web build, but the build completed successfully and did not affect acceptance.

Several earlier read-only verification attempts failed because of PowerShell quoting/CRLF handling. They did not mutate production state and are not part of the accepted release path.

## Acceptance decision

Stage 18C.3 is production-accepted.

The complete closure sequence is:

```text
product review
→ implementation
→ tests
→ product commit 7cbd59c
→ CI #114 green
→ controlled web-only production release
→ production smoke
→ production acceptance
→ documentation record
```

No new feature stage is automatically active after this acceptance. The next product increment should be selected only after reviewing the live demo and current evidence; do not automatically add analytics, authentication/RBAC, real integrations, a larger dashboard, persistent onboarding state or broad new functionality without a separate justified stage decision.
