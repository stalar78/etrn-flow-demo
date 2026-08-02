# Stage Workflow

## Lifecycle

```text
Idea → Architecture → Plan → Build → Review → Docs → Commit → Handoff
```

## 1. Idea

Goal: define the product before code.

Required artifacts:

- `.idea/raw_idea.md`
- `.idea/problem.md`
- `.idea/target_user.md`
- `.idea/success_metric.md`
- `.idea/mvp.md`
- `.idea/risks.md`
- `.business/product.md`
- `.business/audience.md`
- `.business/goals.md`
- `.business/monetization.md`
- `.business/constraints.md`

Exit criteria:

- one primary segment selected;
- MVP and exclusions accepted;
- success metric defined;
- legal/product positioning is honest;
- major risks documented.

## 2. Architecture

Goal: create a system blueprint.

Artifacts:

- `.architecture/overview.md`
- `.architecture/modules.md`
- `.architecture/data_flow.md`
- `.architecture/integrations.md`
- `.architecture/deployment.md`
- `.architecture/security_notes.md`
- `.architecture/tradeoffs.md`

Exit criteria:

- frontend/backend/storage approach accepted;
- session isolation defined;
- workflow model defined;
- adapter boundary defined;
- deployment and rollback approach defined;
- threat model reviewed.

## 3. Plan

One major feature or stage equals one plan file.

A plan includes:

- goal;
- required reading;
- current implementation;
- exact proposed changes;
- files to create or change;
- checks;
- risks;
- docs impact;
- approval boundary.

## 4. Build

The agent implements only the approved plan.

Rules:

- no unrelated changes;
- no deployment;
- no destructive commands;
- update tests;
- update docs only when required;
- report final diff and status.

## 5. Review

GPT checks:

- scope;
- architecture;
- behavior;
- tests and checks;
- security;
- documentation;
- unresolved risks.

Decision:

- Accept;
- Accept with follow-up;
- Return for rework;
- Reject and redesign.

## 6. Docs

Update docs only when architecture, behavior, contracts, commands, security, deployment or workflow changed.

## 7. Commit

Use one coherent commit for the accepted task or stage.

## 8. Handoff

Update `docs/HANDOFF.md` when:

- stage closes;
- next step changes;
- important risk appears;
- project moves to a new chat.
