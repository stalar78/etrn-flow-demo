# Initial Codex Task — Architecture Plan

Work only in this repository:

`C:\Users\stala\OneDrive\Рабочий стол\Dev\etrn`

Work in Plan mode only. Do not create or modify files.

## Task

Prepare the minimum sustainable architecture plan for the first public ETRN Flow demo.

## Goal

Choose a practical architecture that one independent developer can deploy and maintain, while supporting:

- guest session isolation;
- real state transitions and event history;
- responsive dispatcher and driver interfaces;
- synthetic seed scenarios;
- a mock operator adapter;
- safe public deployment;
- future replacement of the mock with a real operator-specific adapter.

## Required reading

- `README.md`
- `AGENTS.md`
- `PROJECT_BLUEPRINT.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/SECURITY_POLICY.md`
- `.idea/mvp.md`
- `.idea/risks.md`
- `.architecture/overview.md`
- `.architecture/data_flow.md`
- `.architecture/integrations.md`
- `.architecture/deployment.md`
- `.architecture/security_notes.md`
- `.architecture/tradeoffs.md`

Do not scan unrelated files. The repository may contain documentation only.

## Compare and decide

Analyze at least:

- single full-stack repository vs separate frontend/backend workspaces;
- Node.js/TypeScript backend vs Python/FastAPI for this specific owner and project;
- PostgreSQL vs a simpler temporary store;
- guest session data model and cleanup;
- explicit shipment state machine vs generic workflow engine;
- testing strategy;
- local Docker and production deployment;
- CI checks;
- minimum observability;
- backup and rollback.

## Return

1. Recommended stack and why.
2. Rejected alternatives and tradeoffs.
3. Proposed repository structure.
4. Main modules and boundaries.
5. Initial data model.
6. Shipment workflow model.
7. Guest session isolation design.
8. Mock operator adapter contract.
9. API surface for MVP.
10. Test strategy.
11. Security controls.
12. Deployment topology and rollback.
13. Exact files to create in the technical foundation stage.
14. Checks and acceptance criteria.
15. Documentation updates required.
16. Risks and any truly blocking questions.
17. Recommended first implementation commit message.

## Constraints

- No file changes.
- No real operator integration.
- No signatures or legal document handling.
- No microservices.
- No premature generic workflow platform.
- No public repository changes.
- No commit, push or deploy.
