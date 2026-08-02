# Backup Policy

## Documentation stage

No application data exists yet. GitHub private repository is the primary remote backup for accepted docs and code.

## MVP with persistent database

Before public release define:

- database backup schedule;
- retention period;
- backup storage location;
- restore command;
- restore verification;
- rollback for migrations.

Synthetic demo data can be regenerated, but configuration and accepted application state must remain recoverable.
