# Codex Prompt Template — Build Mode

Work only in this repository:

`C:\Users\stala\OneDrive\Рабочий стол\Dev\etrn`

Implement only the approved plan below.

## Approved plan

<paste approved plan>

## Allowed files

- `<file>`
- `<file>`

If another file must change, stop and explain why before changing it.

## Invariants

- Demo remains clearly synthetic.
- No real operator or GIS EPD interaction unless explicitly approved.
- No real personal data or secrets.
- Preserve domain and adapter boundaries.
- Do not deploy.
- Do not run destructive commands.
- Do not change unrelated files.

## Checks

Run available project targets:

```bash
make test
make lint
make typecheck
make build
```

If a target does not exist, inspect real project scripts and report the gap. Do not invent commands.

Also run:

```bash
git diff --check
git status --short
```

## Final report

1. What changed.
2. Files changed.
3. Tests and checks run.
4. Skipped checks and reasons.
5. Documentation impact.
6. Risks and follow-up.
7. Complete diff or a clear path to inspect it.
8. Confirm: no commit, no push, no deploy.
