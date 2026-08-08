# ETRN Flow — Production Operations

## Purpose

This document records the accepted operational baseline for the first public production deployment of ETRN Flow.

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

Production is now a live public demo. Future development remains incremental:

```text
implementation stage
→ review and CI
→ accepted release gate
→ controlled VPS update
→ migrations if required
→ health/smoke validation
→ production acceptance
```

Do not deploy every commit automatically. Deploy only an accepted, reviewed stage or explicit hotfix.

Schema rollback must never be assumed to be safely destructive. Application rollback and database migration/restore decisions must be planned separately when a future stage changes persistence semantics.
