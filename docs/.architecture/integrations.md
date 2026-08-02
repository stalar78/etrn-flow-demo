# Integrations

## MVP integrations

### Mock EPD operator adapter

Required operations:

- submit synthetic document data;
- return synthetic external identifier;
- return success;
- return controlled test failure;
- retry failed submission;
- append integration events.

### Product analytics

Track funnel events only. Do not send shipment fields, names, contacts or notes.

### StalarVision CTA

Open the relevant product page or contact section with a clear source marker.

## Future integrations

- accredited operator API;
- 1C;
- CRM / ERP;
- email;
- Telegram;
- webhook receiver.

## Adapter principle

Domain services depend on an internal interface, not a specific operator SDK or response model.

## Pre-integration checklist

- official API documentation reviewed;
- test environment available;
- credentials policy defined;
- idempotency and retries defined;
- webhook authentication defined;
- logging and redaction defined;
- legal and contractual limitations reviewed.
