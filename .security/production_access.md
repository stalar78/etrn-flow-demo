# Production Access

## Default

AI agents have read-only production access by default.

## Write access

Requires explicit owner approval for the exact action.

## Deployment

A deployment prompt or command must include:

- target service;
- exact commit or image;
- pre-deploy checks;
- database migration impact;
- rollback procedure;
- post-deploy verification.

## Forbidden implicit actions

- changing DNS;
- modifying TLS configuration;
- editing unrelated Nginx sites;
- restarting unrelated services;
- altering other projects on the VPS.
