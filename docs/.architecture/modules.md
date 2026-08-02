# Architecture Modules

Status: draft.

| Module | Responsibility |
|---|---|
| DemoSession | Create, identify, reset and expire a guest workspace |
| Organization | Synthetic shipment participants |
| Driver | Driver profile and assignment |
| Vehicle | Vehicle profile and assignment |
| Shipment | Main aggregate for the trip |
| Cargo | Simplified cargo information |
| Workflow | Allowed transitions and next actions |
| DemoDocument | User-facing representation of the process document |
| EventLog | Append-only event history |
| Attention | Derived delays, errors and discrepancies |
| Notification | Simulated reminders and future delivery boundary |
| Integration | Operator-neutral contract and mock adapter |
| Analytics | Product funnel events without personal data |
| AdminSeed | Immutable base scenarios and safe reset |

## Rule

Do not create a universal workflow engine unless the MVP proves that fixed domain transitions are insufficient.
