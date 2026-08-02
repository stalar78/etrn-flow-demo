# Project Blueprint — ETRN Flow

## 1. Project identity

- Project name: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Idea / Product Definition
- Repository: создать после принятия стартовой документации
- Planned stack: React + TypeScript frontend; backend and persistence to be selected during Architecture stage

## 2. Purpose

Показать потенциальным клиентам, как индивидуальная веб-система может объединить рейсы, участников перевозки, статусы, события, уведомления и будущую интеграцию с оператором ИС ЭПД.

Проект создаётся как:

- коммерческая демонстрация компетенций StalarVision;
- самостоятельный продуктовый кейс;
- источник лидов с продуктовой страницы и Яндекс Директа;
- основа для дальнейшего пилота с реальным заказчиком.

## 3. Primary target user

Основной первый сегмент: небольшая или средняя компания с регулярными автомобильными грузоперевозками, собственным диспетчером или отделом логистики и отсутствием удобного единого интерфейса вокруг ЭТрН.

Основной представитель клиента: руководитель логистики, собственник, операционный директор или IT-ответственный.

## 4. Success metric

Первая продуктовая метрика:

> Публичное демо позволяет посетителю без инструкции пройти основной сценарий перевозки за 3–5 минут и понять предложение StalarVision.

Первая коммерческая метрика:

> Получено хотя бы одно квалифицированное обращение по аудиту, интеграции или разработке системы вокруг ЭТрН после запуска целевого трафика.

## 5. Current scope

В MVP входят:

- гостевой демонстрационный вход;
- dashboard;
- список рейсов;
- мастер создания рейса;
- карточка перевозки;
- role switching;
- mobile-first интерфейс водителя;
- действия склада и грузополучателя;
- проблемные сценарии;
- журнал событий;
- mock integration adapter;
- CTA StalarVision;
- аналитика ключевых действий;
- production deployment.

Не входят:

- реальная ГИС ЭПД;
- реальный оператор ИС ЭПД;
- КЭП, ПЭП, МЧД и криптография;
- реальные документы и персональные данные;
- 1С/CRM/ERP интеграции;
- биллинг;
- полноценная TMS;
- production multi-tenancy для клиентов.

## 6. Architecture overview

Предварительная схема:

```text
Visitor
  → Web UI
  → Demo API / Application Services
  → Demo Workflow Engine
  → Demo Database / Session State
  → Mock Operator Adapter
  → Synthetic response and events
```

Реальная внешняя интеграция должна подключаться позднее через заменяемый adapter boundary.

## 7. Core modules

| Module | Responsibility | MVP notes |
|---|---|---|
| Demo access | Гостевая сессия и сброс демо | Без полноценной регистрации |
| Organizations | Демонстрационные участники | Только синтетические данные |
| Drivers | Водители | Без чувствительных документов |
| Vehicles | Транспорт | Справочник и назначение |
| Shipments | Рейсы | Главная бизнес-сущность |
| Cargo | Данные груза | Упрощённая модель |
| Workflow | Этапы и допустимые переходы | Не юридическая модель ЭТрН |
| Demo documents | Визуализация документа | Не имеет юридической силы |
| Events | Неизменяемая история действий | Для UI и аудита демо |
| Attention center | Просрочки и проблемы | Основная демонстрационная ценность |
| Notifications | Имитация уведомлений | Внешняя отправка не обязательна |
| Analytics | Продуктовые события | Без персональных данных |
| Integration adapters | Mock и будущие операторы | Изолированный контракт |

## 8. Data flow

```text
User action
→ validation
→ permission check for active demo role
→ workflow transition
→ shipment/document state update
→ event creation
→ optional mock integration response
→ UI refresh
→ product analytics event
```

## 9. External integrations

| Integration | MVP | Future | Risk |
|---|---:|---:|---|
| Operator IS EPD API | Mock only | Yes | Contract, legal and format variability |
| 1C | No | Yes | Customer-specific configurations |
| CRM / ERP | No | Yes | Different data contracts |
| Yandex Metrica | Yes | Yes | Do not send personal data |
| Email / Telegram | Internal imitation | Optional | Consent, rate limits, secrets |

## 10. AI-agent workflow

- GPT: product and technical architect, reviewer, keeper of scope and docs.
- Codex: complex, multi-file and architectural implementation.
- Copilot / SourceCraft: small local tasks after architecture is accepted.
- User: project owner, approves decisions, runs agents, controls commits and deployment.

Complex tasks use Plan → approval → Build.

## 11. Security model

- Only synthetic demo data.
- No real signatures, certificates or legal documents.
- No secrets in repository.
- Public demo sessions must be isolated.
- Production access for agents is read-only by default.
- Destructive commands and deployment require explicit approval.
- Uploads are absent or strongly restricted in MVP.

## 12. Commands

The Makefile is created after the technical stack and real package scripts exist. It must wrap only real commands.

## 13. Documentation map

| File / folder | Purpose |
|---|---|
| `README.md` | Entry point and current status |
| `AGENTS.md` | Compact agent rules |
| `docs/PRODUCT_REQUIREMENTS.md` | Full product and MVP requirements |
| `docs/AI_ARCHITECT_WORKFLOW.md` | Roles and workflow |
| `docs/STAGE_WORKFLOW.md` | Stage lifecycle |
| `docs/SECURITY_POLICY.md` | Security rules |
| `docs/DOCS_MAINTENANCE.md` | Documentation policy |
| `docs/HANDOFF.md` | Current state for a new chat |
| `.business/` | Business context |
| `.idea/` | Idea validation and MVP |
| `.architecture/` | System design |
| `.plans/` | Approved plans |
| `.security/` | Operational security memory |

## 14. Key decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-08-02 | Start with a public demo, not a real EPD platform | Validate demand without regulatory and integration overhead |
| 2026-08-02 | Product page and demo are separate surfaces | Landing sells; demo proves capability |
| 2026-08-02 | Use only synthetic data | Security, privacy and public portfolio safety |
| 2026-08-02 | Real operator integration is out of MVP | Depends on first customer and operator API |
| 2026-08-02 | Documentation before code | Prevent uncontrolled scope and false legal claims |

## 15. Main risks

| Risk | Impact | Mitigation |
|---|---|---|
| Product mistaken for an accredited operator | Legal and reputational | Persistent demo disclaimer and clear positioning |
| Overbuilding a TMS | Long delay | Strict MVP and stage gates |
| Demo looks like static mockup | Weak trust | One complete interactive workflow and persistent events |
| Unverified legal detail | Misleading content | Separate product workflow from legal EPD specification |
| Public abuse | Cost and instability | Rate limits, session quotas, reset and synthetic data |
| No demand after advertising | Lost time | Launch minimally, measure, refine commercial page and keywords |

## 16. Next steps

1. Review and accept starter documentation.
2. Initialize local Git repository.
3. Create a private GitHub repository and initial docs commit.
4. Prepare Architecture Stage plan.
5. Select technical stack only after comparing MVP needs and deployment constraints.
