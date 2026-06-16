FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

ENV NODE_ENV="production"


# Dependency stage — download keyed on the lockfile alone, install keyed on manifests
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store NODE_ENV=development pnpm fetch

COPY packages/types/package.json ./packages/types/
COPY packages/middleware/package.json ./packages/middleware/
COPY packages/client/package.json ./packages/client/
COPY packages/gateway/package.json ./packages/gateway/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store NODE_ENV=development pnpm install --frozen-lockfile --offline

COPY tsconfig.json ./


# Per-package build stages — middleware and client build in parallel
FROM deps AS build-types

COPY packages/types/ ./packages/types/
RUN pnpm --filter @triptap/types build


FROM build-types AS build-middleware

COPY packages/middleware/ ./packages/middleware/
# Transpile-only: CI owns the type gate (.github/workflows/ci.yml), so skip it here for speed.
RUN pnpm --filter @triptap/middleware exec tsc -p tsconfig.build.json --noCheck \
 && pnpm --filter @triptap/middleware exec tsc-alias -p tsconfig.build.json --resolve-full-paths


FROM build-types AS build-client

COPY packages/client/ ./packages/client/
RUN pnpm --filter @triptap/client build


# Production stage — fresh install with only production deps (client ships as static files)
FROM base AS prod-deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/middleware/package.json ./packages/middleware/
COPY packages/client/package.json ./packages/client/
COPY packages/gateway/package.json ./packages/gateway/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --ignore-scripts --filter '!@triptap/client'


# Final stage
FROM base

WORKDIR /app

# Production node_modules
COPY --from=prod-deps /app /app

# Built artifacts
COPY --from=build-types /app/packages/types/dist/ ./packages/types/dist/
COPY --from=build-types /app/packages/types/src/ ./packages/types/src/
COPY --from=build-middleware /app/packages/middleware/dist/ ./packages/middleware/dist/
COPY --from=build-middleware /app/packages/middleware/src/ ./packages/middleware/src/
COPY --from=build-middleware /app/packages/middleware/drizzle.config.ts ./packages/middleware/drizzle.config.ts
COPY --from=build-client /app/packages/client/dist/ ./packages/client/dist/
COPY packages/gateway/server.js ./packages/gateway/server.js

WORKDIR /app/packages/gateway

EXPOSE 3001
CMD ["node", "server.js"]
