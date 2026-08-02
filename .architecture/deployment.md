# Deployment

Status: draft for Architecture Stage.

## Target

Public demo on a separate StalarVision subdomain, preliminary:

```text
etrn-flow.stalarvision.ru
```

## Expected topology

```text
Internet
→ HTTPS / Nginx
→ Web frontend
→ Application API
→ Database
```

A single VPS deployment may be sufficient for MVP if isolation and resource limits are configured.

## Requirements

- Docker or another reproducible deployment method;
- environment configuration outside Git;
- healthcheck;
- bounded logs;
- database backup if state is persistent;
- automated cleanup of expired guest sessions;
- rollback to previous image or commit;
- no manual partial replacement of production files.

## Deployment gate

Before first deploy:

- build and tests pass;
- security review passes;
- secrets scan passes;
- synthetic data audit passes;
- domain and TLS plan accepted;
- rollback documented;
- owner explicitly approves deployment.
