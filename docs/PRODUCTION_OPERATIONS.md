# ETRN Flow — Production Operations

## Purpose

This document records the accepted operational baseline for the public production deployment of ETRN Flow and subsequent controlled release updates.

ETRN Flow remains a synthetic public demo. Do not store real customer data, real personal data, legally significant transport documents, credentials, private keys or production secrets in the repository.

## Production endpoint

- Public URL: `https://etrn.stalarvision.ru`
- Public IPv4 used at initial launch: `159.194.227.32`
- Host reverse proxy: Nginx + Certbot on the VPS
- Application loopback: `127.0.0.1:8083`
- Container topology: host Nginx → web container → API container → PostgreSQL
- Only the web container is published to the host, at `127.0.0.1:8083:8080`.

## VPS placement

Production project checkout:

```text
/home/stanislav/project/etrn-flow
```

Production environment file:

```text
/home/stanislav/project/etrn-flow/.env.production
```

Rules:

- `.env.production` is outside Git tracking and must remain ignored;
- file mode is `600`;
- never print or commit its values;
- `POSTGRES_PASSWORD` and the password embedded in `DATABASE_URL` must remain consistent.

## Nginx and TLS

ETRN-specific host Nginx files:

```text
/etc/nginx/sites-available/etrn.stalarvision.ru
/etc/nginx/sites-enabled/etrn.stalarvision.ru
```

Accepted proxy target:

```text
http://127.0.0.1:8083
```

Required forwarded headers include:

```text
Host
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
```

TLS certificate location managed by Certbot:

```text
/etc/letsencrypt/live/etrn.stalarvision.ru/
```

The initial certificate was issued successfully and Certbot automatic renewal was verified with `certbot renew --dry-run`.

Do not modify QuoteFlow, ApprovalFlow or `elagin-portal` Nginx/TLS configuration as part of ETRN operations.

A pre-existing QuoteFlow Nginx warning about redefined protocol options is not part of the ETRN deployment and must not be changed incidentally.

## Production containers

Expected long-running containers:

```text
etrn-flow-prod-postgres
etrn-flow-prod-api
etrn-flow-prod-web
```

Expected one-shot migration service:

```text
compose-migrate-1
```

Healthy baseline:

```text
postgres  Up ... (healthy)
api       Up ... (healthy)
web       Up ... (healthy)
migrate   Exited (0)
```

Do not use broad Docker cleanup commands such as `docker system prune`, `docker volume prune` or an unscoped `docker compose down` on this shared VPS.

## Production smoke checks

Primary external health check:

```bash
curl -i https://etrn.stalarvision.ru/health
```

Expected result: HTTP 200 with the accepted strict CSP/security headers.

The first production acceptance also verified:

- `/` over HTTPS;
- `/api/session` with Secure/HttpOnly/SameSite=Lax guest cookie;
- `/api/demo/bootstrap`;
- `/api/shipments`;
- HTTP → HTTPS redirect;
- DNS resolution to the production VPS;
- `nginx -t` success;
- stable healthy containers after startup.

## Controlled Stage 16C + Stage 17A–17D production release — 2026-08-08

The accumulated Stage 16C + Stage 17A–17D repository baseline was promoted through a separate controlled release checkpoint after repository acceptance.

Accepted release evidence:

- pre-release VPS checkout was clean before update;
- production `.env.production` remained mode `600`;
- `GUEST_SESSION_RATE_MAX_REQUESTS` was updated from `6` to the accepted Stage 17B default `8`;
- production Compose config validated successfully after the env update;
- pre-release backup `/home/stanislav/backups/etrn-flow/etrn-flow-20260808T131846Z.dump` was created with mode `600` and observed size `28528` bytes;
- the backup archive was verified as readable with `pg_restore -l` using the existing `postgres:17-alpine` image; no host PostgreSQL package installation was required;
- production checkout advanced to `0938c64f4baf26ff3618678a0f278aaac3096ca5`, which includes the accepted Stage 17D product code and Stage 17C/17D documentation sync;
- production API and web images built successfully;
- migrations completed through the accepted one-shot migration service;
- API and web were replaced with targeted `--no-deps --force-recreate` commands;
- PostgreSQL was not restarted during the runtime replacement;
- API and web returned to `healthy` state;
- web remained published only at `127.0.0.1:8083:8080`;
- runtime API env confirmed `GUEST_SESSION_RATE_MAX_REQUESTS=8`;
- loopback and public `/health` checks returned the accepted health payload;
- production bundle contained the Stage 17D commercial heading and CTA;
- isolated external smoke created a new guest session and bootstrapped three synthetic shipments;
- `DEMO-002` was verified through `in_transit → attention_required → in_transit → awaiting_unloading` using `reportAttention`, `resolveAttention` and `arriveForUnloading`;
- reset returned `DEMO-002` to deterministic `in_transit`;
- final external `/health` remained successful;
- Nginx, Certbot and neighboring project resources were not modified.

This release is accepted. Stage 16C + Stage 17A–17D are therefore considered deployed, not merely repository-accepted.

## Favicon production update — 2026-08-08

A subsequent isolated frontend update added the StalarVision-based browser favicon.

Repository evidence:

- PR #32: `feat: add favicon`;
- accepted merge commit: `90a8f81867f6bf1c0d6190ee91176e7b81793d25`;
- CI #91 passed `Checks`, `Security scan` and `Production stack`;
- application change is limited to `apps/web/index.html` plus `apps/web/public/favicon.png`.

Production evidence:

- VPS checkout advanced to `90a8f81867f6bf1c0d6190ee91176e7b81793d25`;
- only the `web` image was rebuilt;
- only `etrn-flow-prod-web` was force-recreated with `--no-deps`;
- final web container health was `healthy`;
- exact binding remained `127.0.0.1:8083→8080`;
- `https://etrn.stalarvision.ru/favicon.png` returned HTTP 200 with `Content-Type: image/png` and `Content-Length: 89864`;
- production HTML contained `href="/favicon.png"`;
- public `/health` remained successful;
- API, PostgreSQL, host Nginx, Certbot and neighboring projects were not changed.

## Stage 18A UX production update — 2026-08-08

Stage 18A was released after repository acceptance as a separate frontend-only update.

Repository evidence:

- Stage 18A.1 — Scenario Orientation Polish, PR #34;
- Stage 18A.1 accepted squash merge: `cf0f6b607a91269d4c87069536cccebd5905849f`;
- CI #95 passed `Checks`, `Security scan` and `Production stack`;
- Stage 18A.2 — Scenario Discoverability in Shipment List, PR #35;
- Stage 18A.2 accepted squash merge: `79491515f3e97222e1343023ae8bab83e86e6935`;
- CI #97 passed `Checks`, `Security scan` and `Production stack`.

Production evidence:

- VPS checkout advanced from the post-release docs baseline to `79491515f3e97222e1343023ae8bab83e86e6935`;
- the update affected only frontend code and styles;
- only the `web` image was rebuilt;
- only `etrn-flow-prod-web` was force-recreated with `--no-deps`;
- API and PostgreSQL were not rebuilt or restarted;
- host Nginx and Certbot were not modified;
- neighboring projects were not modified;
- final `etrn-flow-prod-web` health was `healthy`;
- production bundle observed after deployment: `/assets/index-DjBp550v.js`;
- production bundle contained `Основной путь перевозки`;
- production bundle contained `Отклонение и восстановление`;
- production bundle contained `Завершённый пример`;
- production bundle contained the updated `DEMO-002` guided text beginning `Чтобы посмотреть обработку отклонения`;
- public `/health` remained successful with `{"status":"ok","service":"etrn-flow-api"}`.

This release is accepted. Stage 18A is therefore deployed in production.

Current production checkout baseline after Stage 18A:

```text
79491515f3e97222e1343023ae8bab83e86e6935
```

The current latest accepted product-code baseline is Stage 18A.2 merge `79491515f3e97222e1343023ae8bab83e86e6935`.

## Backups on the VPS

Backup directory:

```text
/home/stanislav/backups/etrn-flow
```

Directory mode:

```text
700
```

Backup script:

```text
/usr/local/sbin/etrn-flow-backup
```

Accepted script ownership/mode:

```text
root:stanislav
750
```

Each dump is a PostgreSQL custom-format archive created with `pg_dump -Fc` and receives mode `600`.

Daily schedule:

```text
/etc/cron.d/etrn-flow-backup
```

Accepted cron entry:

```text
20 3 * * * stanislav /usr/local/sbin/etrn-flow-backup >> /home/stanislav/backups/etrn-flow/backup.log 2>&1
```

The VPS timezone is `Etc/UTC`, so the backup runs daily at `03:20 UTC`, which is `06:20 MSK`.

Retention baseline: delete matching ETRN `.dump` files older than 7 days.

## Restore verification

The first production backup was verified as a PostgreSQL custom archive with `pg_restore -l`, restored into a separate temporary database, checked, and the temporary database was then removed.

Verified restored counts from the first production backup:

```text
guest_sessions                  5
shipments                      15
shipment_events                70
guest_session_usage_limits      5
```

The production database `etrn_flow` was not modified by the restore check.

A restore test must always target a separate temporary database unless a separately approved disaster-recovery procedure explicitly authorizes restoring production.

## Off-VPS recovery copy

The first verified off-VPS copy is stored on the owner's Windows workstation under:

```text
C:\Users\stala\Backups\etrn-flow\
```

First accepted recovery copy:

```text
C:\Users\stala\Backups\etrn-flow\etrn-flow-20260807T191218Z.dump
```

Observed size at copy time:

```text
20338 bytes
```

This local path is operational documentation only. Backup binaries themselves must never be committed to the repository.

The initial Stage 16 baseline requires at least one verified off-VPS recovery copy. More advanced remote/object-storage automation can be introduced in a later operations stage if justified.

## Repository release baseline

The first post-launch repository security maintenance was accepted as Stage 16C:

- accepted merge commit: `81a69da562bfe112584f353f1638f2443af3481a`;
- CI #74 passed `Checks`, `Security scan` and `Production stack`;
- `postcss` resolves to `8.5.26` and `nanoid` to `3.3.18`;
- `vite` and `@vitejs/plugin-react` are `devDependencies`;
- Stage 16C did not change application logic, API, schema, Docker/Compose, Nginx, production ports or VPS configuration.

Stage 16C is deployed as part of the accepted 2026-08-08 controlled production release together with Stage 17A–17D. Stage 18A is also deployed as a later web-only update.

## Isolation rules

ETRN production resources are limited to the ETRN paths, containers, network, volume, port and domain.

Do not modify, stop, remove, reuse or restart neighboring project resources unless a separate task explicitly targets them:

- ApprovalFlow;
- QuoteFlow;
- `elagin-portal`.

Known neighboring loopbacks at initial launch:

```text
QuoteFlow     127.0.0.1:8081
ApprovalFlow  127.0.0.1:8082
ETRN Flow     127.0.0.1:8083
```

## Release/update boundary

Production is a live public demo. Future development remains incremental:

```text
implementation stage
→ review and CI
→ accepted release gate
→ controlled VPS update
→ migrations if required
→ health/smoke validation
→ production acceptance
```

Do not deploy every commit automatically. Deploy only an accepted, reviewed stage or explicit hotfix/UI maintenance update.

Schema rollback must never be assumed to be safely destructive. Application rollback and database migration/restore decisions must be planned separately when a future stage changes persistence semantics.
