PNPM := corepack pnpm
COMPOSE := docker compose -f infra/compose/docker-compose.yml

.PHONY: install dev dev-web dev-api test test-unit test-integration lint typecheck build check db-up db-down db-generate db-migrate db-check

install:
	$(PNPM) install

dev:
	$(PNPM) dev

dev-web:
	$(PNPM) dev:web

dev-api:
	$(PNPM) dev:api

test:
	$(PNPM) test

test-unit:
	$(PNPM) test:unit

test-integration:
	$(PNPM) test:integration

lint:
	$(PNPM) lint

typecheck:
	$(PNPM) typecheck

build:
	$(PNPM) build

check:
	$(PNPM) check

db-up:
	$(COMPOSE) up -d postgres

db-down:
	$(COMPOSE) down

db-generate:
	$(PNPM) db:generate

db-migrate:
	$(PNPM) db:migrate

db-check:
	$(PNPM) db:check
