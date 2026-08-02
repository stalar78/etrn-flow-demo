# AI Architect Workflow

## Roles

- GPT-Architect: owns product direction, architecture, scope, review and documentation consistency.
- Codex: performs complex, multi-file, architectural and risky work.
- Copilot / SourceCraft: performs small, local and well-bounded work.
- User: project owner, approves strategy, runs agents, controls commits, GitHub and production actions.

Communication with the user is in Russian. Prompts for coding agents are prepared in Russian for this project unless the owner explicitly requests another language. Technical identifiers remain unchanged.

## Stage model

```text
Idea → Architecture → Plan → Build → Review → Docs → Commit → Handoff
```

## GPT responsibilities

1. Restore current stage.
2. Select one nearest logical step.
3. Preserve project and commercial positioning.
4. Define exact agent scope.
5. Require Plan mode for complex work.
6. Review actual diffs and checks.
7. Accept, request rework or reject.
8. Update only relevant documentation.
9. Prepare the stage commit.
10. Keep `PROJECT_BLUEPRINT.md` and `docs/HANDOFF.md` current.

## Context rule

Every agent prompt states:

- files to read;
- files to modify;
- files not to touch;
- expected result;
- acceptance criteria;
- checks to run;
- security limitations.

Agents must not read the complete Project Brain without a concrete reason.

## Plan → Build rule

For architecture, new subsystems, multi-file changes, security or deployment:

1. Codex works in Plan mode only.
2. It does not modify files.
3. It reports findings, proposed changes, files, risks and checks.
4. GPT reviews the plan.
5. User approves the direction.
6. Only then a Build prompt is issued.

## Review rule

A report is not sufficient. Review must inspect:

- changed files or diff;
- scope adherence;
- architecture consistency;
- checks and test output;
- security impact;
- documentation impact;
- final repository status.

## Commit rule

A commit captures an accepted stage or coherent task, not an arbitrary set of files.

## Production rule

Agents do not deploy by default. Production commands require explicit owner approval and a documented rollback path.
