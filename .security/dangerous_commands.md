# Dangerous Commands

Require explicit user confirmation:

- production deploy;
- `rm -rf`;
- database reset;
- destructive migration;
- Docker volume deletion;
- production database write outside normal application behavior;
- DNS or TLS changes;
- deletion of cloud or GitHub resources;
- force push;
- history rewrite;
- opening a private repository to public access.

Agents must explain impact and rollback before such commands are used.
