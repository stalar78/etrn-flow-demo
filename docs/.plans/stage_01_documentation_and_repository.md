# Stage 01 — Documentation and Repository

## Goal

Create and accept the local project memory, initialize version control and publish the first safe private repository state.

## Current inputs

- accepted product direction;
- preliminary technical specification;
- starter documentation package;
- local project directory created by the owner.

## Scope

1. Place documentation in the repository root.
2. Review naming and content.
3. Ensure no secrets or real personal data exist.
4. Add `.gitignore` and safe `.env.example` when the technical skeleton is created.
5. Initialize Git.
6. Create private GitHub repository.
7. Commit documentation.
8. Push `main`.
9. Record repository URL in `PROJECT_BLUEPRINT.md` and `docs/HANDOFF.md`.

## Out of scope

- application code;
- package installation;
- framework selection;
- database;
- production deployment;
- public repository visibility.

## Expected outcome

A clean private repository containing accepted documentation and ready for Architecture Stage planning.

## Checks

- all expected files exist;
- Markdown paths are correct;
- no empty template remains where a project-specific document is required;
- no secrets or real personal data;
- `git status` clean after commit;
- remote `main` contains the same commit.

## Risks

- duplicate or conflicting first technical specification;
- repository accidentally created public;
- local OneDrive sync causing transient file locks;
- committing environment files or unrelated artifacts.

## Suggested commit

```text
docs: initialize ETRN Flow project brain
```
