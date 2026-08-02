# Review Checklist

## Scope

- Only approved files changed?
- No unrelated reformat or deletion?
- No hidden dependency additions?

## Product

- Demo remains clearly labeled?
- No false claim about operator, GIS EPD or signatures?
- Main user flow improved?

## Architecture

- Existing boundaries preserved?
- No unnecessary parallel abstraction?
- Domain transitions validated centrally?
- Integration remains behind adapter?

## Quality

- Tests and checks run?
- Errors handled without broad suppression?
- No hardcoded secret or environment-specific value?
- Accessibility and responsive impact reviewed?

## Security

- Synthetic data only?
- Sessions isolated?
- Inputs validated?
- Logs and analytics redacted?
- No production action without approval?

## Docs

- Public behavior, contracts, commands or architecture changed?
- Relevant docs updated without duplication?

## Decision

- Accept.
- Accept with follow-up.
- Return for rework.
- Reject and redesign.
