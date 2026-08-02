PNPM := corepack pnpm
COMPOSE := docker compose -f infra/compose/docker-compose.yml

.PHONY: install dev dev-web dev-api test lint typecheck build check db-up db-down

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
