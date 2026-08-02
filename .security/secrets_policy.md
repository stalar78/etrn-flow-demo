# Secrets Policy

## Storage

- local `.env` files excluded from Git;
- production secrets stored outside repository;
- `.env.example` contains names and safe placeholders only;
- no credentials in frontend bundles.

## Handling

- never paste real secrets into prompts;
- never place secrets in screenshots or docs;
- redact tokens from logs and agent reports;
- rotate a secret immediately if exposure is suspected.

## Future integration

Use separate credentials for development, test and production. Grant minimum required permissions and document rotation ownership.
