# Architecture Overview

Status: preliminary; final decisions require Architecture Stage approval.

## High-level system

```text
Browser
→ Web application
→ Application API
→ Domain services and workflow rules
→ Demo persistence
→ Mock operator adapter
```

## Architecture goals

- one complete credible demo workflow;
- clear separation of UI, domain rules and external adapters;
- safe public guest sessions;
- practical deployment for an independent developer;
- ability to replace the mock adapter later;
- no premature enterprise complexity.

## Required boundaries

- presentation layer;
- shipment/workflow domain;
- persistence;
- analytics;
- external integration adapter;
- security and session isolation.

## Decisions deferred

- monorepo vs single application repository;
- Node.js vs Python backend;
- database and session implementation;
- component library;
- hosting topology;
- exact CI/CD.
