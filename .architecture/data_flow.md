# Data Flow

## Inputs

- guest entry;
- selected demo role;
- shipment wizard fields;
- workflow actions;
- notes from prepared safe options or short text;
- reset command.

## Processing

1. Resolve demo session.
2. Validate request.
3. Load shipment aggregate.
4. Check allowed role and transition.
5. Apply domain state change.
6. Append event.
7. Optionally invoke mock adapter.
8. Recalculate attention items.
9. Persist session state.
10. Return safe view model.
11. Emit analytics event without payload data.

## Outputs

- dashboard summaries;
- shipment lists and details;
- workflow timeline;
- next allowed actions;
- event log;
- attention items;
- mock integration results.

## Storage

The Architecture Stage must decide between:

- per-session database records;
- cloned seed workspace;
- compact event/state model;
- expiry and cleanup policy.

Visitor-created data must never be visible to another guest session.
