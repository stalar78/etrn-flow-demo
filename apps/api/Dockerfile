FROM node:22-alpine AS base
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @etrn-flow/shared build \
  && pnpm --filter @etrn-flow/domain build \
  && pnpm --filter @etrn-flow/api build \
  && pnpm --filter @etrn-flow/api deploy --prod /prod/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S etrn && adduser -S etrn -G etrn
COPY --from=build --chown=etrn:etrn /prod/api ./
COPY --from=build --chown=etrn:etrn /workspace/apps/api/dist ./dist
COPY --from=build --chown=etrn:etrn /workspace/apps/api/drizzle ./drizzle
USER etrn
EXPOSE 3000
CMD ["node", "dist/server.js"]
