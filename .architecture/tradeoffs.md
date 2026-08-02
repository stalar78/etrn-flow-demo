# Architecture Tradeoffs

## Real backend vs frontend-only mock

Frontend-only is faster but weaker as an engineering case and makes safe isolated workflows less credible.

Preferred direction: a small real backend for guest sessions, transitions and events, while keeping integrations mocked.

## PostgreSQL vs temporary in-memory state

In-memory state is simple but fragile across restarts and scaling.

Preferred direction: PostgreSQL if deployment complexity remains reasonable.

## Monolith vs microservices

Microservices are unnecessary for MVP.

Preferred direction: modular monolith with explicit domain and adapter boundaries.

## Generic workflow engine vs fixed shipment transitions

A generic engine adds scope and abstraction risk.

Preferred direction: explicit domain transitions first.

## Full authentication vs guest sessions

Full customer onboarding is out of scope.

Preferred direction: isolated expiring guest sessions with demo role switching.
