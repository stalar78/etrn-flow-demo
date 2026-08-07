# AGENTS.md

> Короткое операционное руководство для AI-агентов. Подробности находятся в `PROJECT_BLUEPRINT.md` и Project Brain.

## Project overview

- Project: `ETRN Flow`
- Owner: ИП Ларин Станислав Николаевич / StalarVision
- Current stage: Stages 03–15B accepted and merged; next controlled stage is public-release security/privacy hardening
- Latest accepted `main`: `b4868f17563b256b4ca1973f11390f02ac46a942`
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

## Accepted lifecycle hardening

Stage 15B добавил ручной bounded cleanup истёкших guest sessions:

- eligibility: `expires_at < now() - interval '24 hours'`;
- batch size: 500;
- maximum batches per run: 100;
- deterministic oldest-first delete;
- PostgreSQL `FOR UPDATE SKIP LOCKED`;
- удаляется только `guest_sessions`, дочерние synthetic rows удаляются существующими `ON DELETE CASCADE`;
- HTTP endpoint, request-driven cleanup и scheduler не добавлены.

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

## Final report

В конце каждой задачи сообщить:

1. Что сделано.
2. Какие файлы изменены.
3. Какие проверки запущены.
4. Какие проверки пропущены и почему.
5. Нужны ли обновления документации.
6. Риски и ближайший следующий шаг.
