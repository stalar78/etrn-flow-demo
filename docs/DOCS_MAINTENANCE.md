# Documentation Maintenance

## Purpose

Documentation must describe the current system and help the next project step. It is not an archive of every past thought.

## Update when

- product scope changes;
- architecture changes;
- workflow states or contracts change;
- commands or Makefile change;
- deployment or rollback changes;
- security controls change;
- public behavior changes;
- external integrations change;
- agent rules change.

## Do not update when

- a small implementation detail changes without affecting public behavior or architecture;
- a temporary experiment is not accepted;
- code is refactored without changing contracts;
- the information is already clear from a stable command or schema.

## Source of truth

- product: `docs/PRODUCT_REQUIREMENTS.md` and `.business/`;
- architecture: `PROJECT_BLUEPRINT.md` and `.architecture/`;
- agent behavior: `AGENTS.md` and `.architect/`;
- active work: `.plans/`;
- security: `docs/SECURITY_POLICY.md` and `.security/`;
- current state: `docs/HANDOFF.md`.

## Review checklist

- Does documentation match code and configuration?
- Are commands real and available?
- Is there duplication of package scripts or CI bodies?
- Are temporary decisions presented as permanent?
- Are secrets or real personal data absent?
- Are links and paths current?
- Does the document help the next stage?

## Concision rule

Keep these short:

- `AGENTS.md`;
- `docs/HANDOFF.md`;
- prompts;
- active plan summaries.

Allow deeper detail in:

- product requirements;
- architecture;
- security;
- business constraints.
