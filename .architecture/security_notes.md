# Security Notes

## Main assets

- public service availability;
- VPS and deployment credentials;
- database integrity;
- future integration credentials;
- StalarVision reputation.

## Main threats

- automated guest session abuse;
- denial of service through object creation;
- cross-session data exposure;
- injection through free-form inputs;
- secrets committed to Git;
- unsafe error logging;
- open CORS;
- unauthorized admin access;
- upload abuse if files are added.

## MVP mitigations

- synthetic data only;
- short session lifetime;
- quotas and rate limits;
- server-side authorization by session and role;
- parameterized database access;
- schema validation;
- no admin UI exposed publicly;
- strict environment handling;
- minimal dependencies;
- regular dependency and secret scans;
- no file upload in initial release.
