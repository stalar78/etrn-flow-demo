# Threat Model

## Assets

- public demo availability;
- VPS and deployment access;
- database integrity;
- repository history;
- future integration credentials;
- StalarVision brand trust.

## Actors

- normal visitor;
- automated bot;
- malicious visitor;
- coding agent making an unsafe change;
- operator of the server;
- future authenticated customer.

## Main threats

- session data leakage;
- mass object creation;
- injection;
- unauthorized role/action calls;
- brute-force or endpoint abuse;
- secrets exposure;
- dependency compromise;
- unsafe deployment;
- misleading legal behavior;
- accidental use of real data.

## MVP controls

- synthetic data only;
- expiring guest sessions;
- quotas and rate limits;
- server-side transition authorization;
- input schemas;
- no file upload;
- no public admin panel;
- environment secrets;
- bounded logs;
- dependency and secret scans;
- explicit deployment approval.
