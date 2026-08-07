# AGENTS.md

> Короткое операционное руководство для AI-агентов. Подробности находятся в `PROJECT_BLUEPRINT.md` и Project Brain.

## Project overview

- Project: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stages 03–15D accepted; next controlled stage is Stage 16 — controlled deployment
- Latest accepted product-code merge: Stage 15C, `4ae57a70c1c1e0f5ef5455f4208e00a54870ab69`
- Stage 15D was evidence-only: no application-code, schema, Docker/Compose or dependency changes
- Public deployment: not performed
- Main docs: `docs/`
- Blueprint: `PROJECT_BLUEPRINT.md`
- Project memory: `.business/`, `.idea/`, `.architecture/`, `.architect/`, `.plans/`, `.security/`

## Source of truth order

1. Текущая инструкция пользователя.
2. `PROJECT_BLUEPRINT.md`.
3. `AGENTS.md`.
4. Релевантные документы Project Brain.
5. Принятый stage plan.
6. Существующий код и его паттерны.

При конфликте документации с фактическим кодом сообщить о конфликте и не угадывать.

## Scope rules

- Читать только файлы, относящиеся к задаче.
- Не сканировать весь репозиторий без конкретной причины.
- Не менять unrelated files.
- Не форматировать unrelated code.
- Не удалять и не перезаписывать чужие изменения.
- Для сложных и многофайловых задач сначала использовать Plan mode.

## Architecture rules

- Сохранять принятую архитектуру.
- Не создавать параллельные абстракции без необходимости.
- Переиспользовать существующие типы, схемы, компоненты и сервисы.
- Исправлять причины, а не маскировать симптомы.
- Реальную интеграцию с оператором строить через отдельный adapter boundary.
- Демонстрационный workflow не выдавать за юридическую модель ЭТрН.

## Safety rules

Запрещено без отдельного подтверждения:

- production deploy;
- destructive migrations;
- удаление файлов, баз или Docker volumes;
- изменение production data;
- добавление реальных секретов;
- подключение реального оператора ИС ЭПД;
- отправка реальных сообщений внешним пользователям.

Секреты не должны попадать в Git, docs, prompts, screenshots и логи.

## Codex workflow

- Все промпты для Codex пишутся на русском языке.
- Названия файлов, путей, компонентов, переменных, команд и других технических сущностей сохраняются в точном виде из кода.
- Codex изменяет только одобренный код и техническую конфигурацию.
- Codex не изменяет постоянную документацию или Project Brain без явного разрешения.
- Codex не выполняет commit, push, PR, merge или deployment без отдельной команды.
- GPT отвечает за архитектурное направление, review, scope и синхронизацию документации.

## Accepted lifecycle and release hardening

Stage 15B добавил ручной bounded cleanup истёкших guest sessions:

- eligibility: `expires_at < now() - interval '24 hours'`;
- batch size: 500;
- maximum batches per run: 100;
- deterministic oldest-first delete;
- PostgreSQL `FOR UPDATE SKIP LOCKED`;
- удаляется только `guest_sessions`, дочерние synthetic rows удаляются существующими `ON DELETE CASCADE`;
- HTTP endpoint, request-driven cleanup и scheduler не добавлены.

Stage 15C добавил repository-level public-release hardening:

- `drizzle-orm` upgraded to patched `^0.45.2`;
- CI production dependency audit with `pnpm audit --prod --audit-level high`;
- full-history Gitleaks security scan pinned to immutable action SHA;
- reusable Nginx security headers snippet and strict CSP;
- production response-header smoke for root, index, built asset, `/health` and `/api/session`.

Stage 15D completed a local evidence-only release rehearsal:

- production Compose config/build/migrations/startup passed;
- `postgres`, `api`, `web` became healthy;
- same-origin health/API smoke passed with production security headers;
- logical PostgreSQL backup with `pg_dump -Fc` was created and copied outside the container;
- restore into a separate synthetic DB reproduced guest session, 3 shipments, 14 events, usage state and Drizzle migration metadata;
- restart of `api` and `web` preserved PostgreSQL state;
- production deployment remained out of scope.

## Commands

После появления Makefile использовать его как стабильный интерфейс:

```bash
make install
make dev
make test
make lint
make typecheck
make build
```

Дополнительная принятая maintenance-команда:

```bash
corepack pnpm db:cleanup-expired-sessions
```

Не придумывать отсутствующие команды. Сначала проверить `Makefile`, `package.json` и конфигурацию проекта.

## Next controlled stage

Stage 16 — controlled deployment.

Deployment stage must separately gate and verify:

- production secret provisioning;
- VPS placement;
- host Nginx reverse proxy;
- TLS/Certbot and HSTS decision;
- firewall;
- external backup storage, retention and restore procedure;
- external health/smoke and rollback boundary.

Do not begin production deployment implicitly from a repository-only task.

## Final report

В конце каждой задачи сообщить:

1. Что сделано.
2. Какие файлы изменены.
3. Какие проверки запущены.
4. Какие проверки пропущены и почему.
5. Нужны ли обновления документации.
6. Риски и ближайший следующий шаг.
