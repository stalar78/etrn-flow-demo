# Security Policy — ETRN Flow

## Principle

The public demo must remain a sandbox with synthetic data. It must not become an accidental production document system.

## Red zone

Requires explicit owner approval:

- production deployment;
- production database writes outside normal application behavior;
- destructive migrations;
- real operator credentials;
- real company or driver data;
- real notifications to external recipients;
- deletion of resources, databases or volumes;
- DNS, TLS or Nginx changes;
- opening public repository access.

## Demo data

Allowed:

- fictional organizations;
- fictional people;
- synthetic identifiers;
- test routes and cargo;
- non-sensitive images.

Forbidden:

- passports;
- driving licences;
- signatures and certificates;
- real invoices and transport documents;
- real API tokens;
- customer data;
- production exports.

## Secrets

Secrets never appear in:

- Git;
- docs;
- prompts;
- screenshots;
- issue descriptions;
- logs;
- analytics events.

Use environment variables and maintain `.env.example` with empty or safe placeholders.

## Public demo controls

Minimum controls:

- isolated guest sessions;
- object quotas;
- rate limiting;
- server-side validation;
- safe error messages;
- security headers;
- restricted CORS;
- no arbitrary external URLs;
- resettable synthetic state;
- logs without sensitive payloads.

## Upload policy

File uploads are out of the initial MVP unless separately justified. If introduced later:

- allowlisted types only;
- strict size limits;
- generated filenames;
- storage outside executable paths;
- malware and content risk review;
- automatic deletion policy.

## Integration policy

The MVP uses a mock adapter only.

Before a real operator integration:

1. review API terms and documentation;
2. define secrets and rotation;
3. define test environment;
4. define request/response logging policy;
5. define retry and idempotency;
6. perform security review;
7. update threat model and rollback.

## Production access

AI agents are read-only by default. Write access and deployment require explicit user approval.

## Incident response minimum

- disable affected integration or public write path;
- preserve logs without exposing secrets;
- rotate compromised credentials;
- restore from known-good deployment or backup;
- record the incident and corrective action.
