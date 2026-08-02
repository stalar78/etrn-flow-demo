# Product Requirements — ETRN Flow

Version: 0.2  
Status: Draft for approval  
Owner: StalarVision / ИП Ларин Станислав Николаевич

## 1. Product summary

`ETRN Flow` is an adaptive public demo of an individual B2B web system for managing road shipments and workflows around electronic transport documents.

The first release demonstrates business operations and an integration-ready interface. It does not transmit documents to an accredited operator or GIS EPD, does not sign documents and does not create legally valid ETRN records.

## 2. Product goal

Create a credible interactive demo that:

- explains StalarVision's service better than a static landing page;
- demonstrates complex dashboards, roles, workflows and integrations;
- can receive targeted traffic from a separate commercial page;
- can later evolve into a pilot for a real customer.

## 3. Positioning

Core statement:

> StalarVision develops individual web systems around ETRN: dispatcher workspaces, driver mobile flows, status control, notifications and integrations with 1C, CRM, ERP and accredited EPD operators.

Mandatory clarification:

> StalarVision is not an accredited EPD operator. The demo does not transmit legally significant documents and does not replace an EPD operator.

## 4. Primary audience

Primary segment:

- small and medium road carriers;
- shippers and distributors;
- freight forwarders;
- manufacturers with their own logistics or warehouse operations.

Decision-makers:

- business owner;
- logistics manager;
- operations director;
- IT manager;
- chief accountant;
- 1C implementation partner.

## 5. Main demo journey

1. Visitor opens the demo landing screen.
2. Visitor reads the demo and legal limitation notice.
3. Visitor enters a guest session.
4. Visitor reviews the dispatcher dashboard.
5. Visitor opens an existing normal shipment.
6. Visitor observes the workflow timeline and event history.
7. Visitor switches to driver and warehouse roles.
8. Visitor performs allowed actions and sees state changes.
9. Visitor creates a new synthetic shipment through a short wizard.
10. Visitor opens a delayed or failed shipment.
11. Visitor sends a simulated reminder or retries a mock integration.
12. Visitor follows a CTA to discuss an individual implementation.

Target completion time: 3–5 minutes for the main path.

## 6. Demo roles

### Dispatcher

- view and filter shipments;
- create a shipment;
- assign driver and vehicle;
- see workflow and issues;
- send simulated reminders;
- retry mock integration.

### Driver

Mobile-first interface:

- see current trip;
- see route, time, cargo and contact;
- confirm arrival;
- confirm cargo receipt;
- add a note;
- confirm cargo transfer.

Actions are simulated and are not an electronic signature.

### Warehouse / Shipper

- see expected vehicles;
- mark arrival;
- start and complete loading;
- add a note;
- transfer cargo to the carrier.

### Consignee

- see expected delivery;
- mark arrival;
- accept cargo;
- record discrepancy or damage;
- finish unloading.

### Manager

- see totals and alerts;
- inspect delayed workflows;
- review synthetic analytics.

## 7. Core entities

- Organization
- Demo user
- Driver
- Vehicle
- Cargo
- Shipment
- Demo transport document
- Workflow transition
- Event
- Notification
- Integration attempt

All records use synthetic values.

## 8. Shipment statuses

Technical identifiers:

- `draft`
- `ready_for_dispatch`
- `awaiting_loading`
- `loading`
- `in_transit`
- `awaiting_unloading`
- `unloading`
- `awaiting_confirmation`
- `completed`
- `attention_required`
- `cancelled`

Russian labels are shown in the UI.

## 9. Required screens

1. Demo entry screen.
2. Dispatcher dashboard.
3. Shipment list.
4. Shipment creation wizard.
5. Shipment detail.
6. Workflow timeline.
7. Event log.
8. Attention center.
9. Driver mobile screen.
10. Manager overview.
11. Reference lists for organizations, drivers and vehicles.
12. About / solution page.

## 10. Prepared scenarios

### Normal shipment

Complete path without problems.

### Delayed consignee confirmation

Shows overdue action, responsible participant and reminder.

### Cargo discrepancy

Shows note, event history and attention state.

### Mock operator error

Shows clear error message, failed attempt and retry.

### Visitor-created shipment

Created in an isolated guest session and removable by reset.

## 11. Functional MVP requirements

- Guest demo entry without registration.
- Isolated demo session.
- Synthetic seed data.
- Read and filter shipment list.
- Create shipment with a multi-step wizard.
- Open shipment details.
- Role switching without reauthentication.
- Allowed actions depend on active demo role and shipment state.
- State transitions are validated by the server or application domain layer.
- Every meaningful state change creates an event.
- Attention center derives problems from current state and deadlines.
- Mock adapter supports success, failure and retry.
- Reset restores the initial session state.
- CTA links to StalarVision.
- Product analytics captures main funnel events.

## 12. Non-functional requirements

### Responsive design

- 360 px minimum supported width;
- 768, 1024 and 1440 px QA checkpoints;
- driver flow is mobile-first;
- desktop tables become usable cards or compact lists on mobile;
- no critical action depends only on hover.

### Usability

- main scenario understandable without documentation;
- current state and next action visible;
- issues explained in plain Russian;
- demo mode is always visible;
- user can restart the demo at any time.

### Performance

- core dashboard and shipment detail load without noticeable delay on normal mobile connection;
- avoid unnecessary heavy charts and dependencies;
- lazy-load non-critical screens when useful.

### Accessibility

- keyboard-accessible actions;
- visible focus;
- semantic form labels;
- sufficient contrast;
- status is not communicated by color alone.

## 13. Security and privacy

- No real personal data.
- No real company documents.
- No real credentials, signatures or certificates.
- No secrets in frontend or repository.
- Server-side validation for writes.
- Guest session isolation.
- Rate limits and object quotas.
- Restricted or absent file upload in MVP.
- Security headers.
- Logs exclude personal and secret values.
- Production actions require explicit owner approval.

## 14. Legal and product disclaimer

Required visible text:

> Приложение работает в демонстрационном режиме. Все организации, сотрудники, рейсы и документы являются вымышленными. Документы не передаются оператору ИС ЭПД или в ГИС ЭПД, не подписываются электронной подписью и не имеют юридической силы.

Additional text:

> StalarVision не является оператором ИС ЭПД. Возможность реальной интеграции зависит от выбранного оператора, его API, договорных условий и требований законодательства.

## 15. Analytics events

- `demo_opened`
- `demo_entered`
- `shipment_list_opened`
- `shipment_opened`
- `shipment_creation_started`
- `shipment_created`
- `demo_role_changed`
- `workflow_action_completed`
- `attention_item_opened`
- `mock_reminder_sent`
- `mock_integration_retried`
- `demo_reset`
- `stalarvision_cta_clicked`

Do not send names, phone numbers, identifiers or free-form notes to analytics.

## 16. Out of MVP

- Real operator API.
- GIS EPD.
- KEP, PEP, MChD.
- Real legal documents.
- Real registration and organization onboarding.
- Billing and subscriptions.
- 1C, CRM and ERP integrations.
- GPS tracking and routing.
- Fuel and vehicle maintenance.
- Full TMS functionality.
- Native mobile applications.
- Real production multi-tenancy.

## 17. Release criteria

The MVP is ready for public deployment when:

- guest entry works;
- all prepared scenarios are available;
- visitor can create a synthetic shipment;
- role-based demo actions work;
- state transitions and event history are consistent;
- mock integration failure and retry work;
- session reset works;
- sessions do not share visitor-created data;
- UI is usable from 360 px to desktop;
- no critical console or network errors occur in the main scenario;
- disclaimers are present;
- CTA and analytics work;
- repository contains no secrets or real data;
- build, typecheck, lint and relevant tests pass;
- deployment and rollback are documented.

## 18. Estimated delivery

Recommended target to first adequate public release: **5–7 calendar weeks**.

Indicative breakdown:

- documentation and product definition: 3–5 workdays;
- repository and technical foundation: 4–6 workdays;
- UX and visual system: 4–7 workdays, partially parallel;
- MVP implementation: 15–22 workdays;
- review, hardening and deployment: 5–8 workdays.

This estimate excludes real operator integration and may change after architecture planning.

## 19. Post-MVP roadmap

1. Improve UX based on analytics.
2. Add more scenarios and filters.
3. Add Excel import and validation.
4. Add real notifications.
5. Add operator-specific adapter in a customer pilot.
6. Add 1C or CRM integration.
7. Introduce production authentication, tenancy and audit controls only when required by a real pilot.
