# sentence-bank

Self-deploy app for building a personal bank of example sentences (language learning).

sentence-bank is a full-stack TypeScript pnpm monorepo: a React client, a Fastify API, a shared types
package, and a production gateway that ties them together behind a single port. It mirrors the
tooling and architecture of [course-tracker](https://github.com/emilyeserven/course-tracker).

## Architecture

| Package | Scope | Description |
|---|---|---|
| `packages/types` | `@sentence-bank/types` | Shared TypeScript types (the API ↔ client contract). |
| `packages/middleware` | `@sentence-bank/middleware` | Fastify 5 API with Drizzle ORM + PostgreSQL, Swagger UI at `/docs`. |
| `packages/client` | `@sentence-bank/client` | React 19 + Vite + TanStack Router/Query/Form + Tailwind 4. |
| `packages/gateway` | `@sentence-bank/gateway` | Fastify reverse proxy and production entrypoint. |

**Build order:** types → middleware → client (the gateway has no build step).

**Tech stack:** Node 22, pnpm 10, TypeScript 5.9 (strict, ES2022). Quality gates via ESLint
(`@emilyeserven/eslint-config`), Husky + commitlint (Conventional Commits), and
[Fallow](https://github.com/fallow-rs/fallow) for dead-code / duplication / complexity audits.

## Local development

Prerequisites: Node 22, pnpm 10 (`corepack enable`), and Docker.

```bash
pnpm install                              # install all workspace dependencies
cp packages/middleware/.env.example packages/middleware/.env
pnpm dev                                  # starts Postgres, applies migrations, runs all packages
```

`pnpm dev` brings up the database via Docker Compose, applies the committed migrations, then runs the
types watcher, the API (http://localhost:3001, docs at `/docs`), and the client
(http://localhost:5173) concurrently. The API auto-seeds a sample sentence on first run.

After changing `packages/middleware/src/db/schema.ts`, run `pnpm db:generate` to emit a new versioned
migration under `packages/middleware/drizzle/` and commit it — migrations are applied automatically on
the next `pnpm dev` / deploy.

### Useful commands

```bash
pnpm build            # build types → middleware → client
pnpm test             # run all package tests
pnpm typecheck        # strict type checking across packages
pnpm lint / lint:fix  # ESLint (run from the repo root)
pnpm verify:changed   # lint + typecheck + test only the changed packages
pnpm fallow           # dead-code / duplication / complexity audit
pnpm studio           # Drizzle Studio (database GUI)
pnpm db:generate      # generate a versioned SQL migration from the schema (commit the result)
pnpm db:migrate       # apply committed migrations to the local database
```

To reset the database: `docker compose down -v && docker compose up --wait db && pnpm db:migrate`.

## Deploy to Coolify

sentence-bank is built to self-deploy. In production a single Docker image (the repo-root `Dockerfile`)
runs the **gateway** on port **3000**: it serves the client's static build, proxies `/api/*` to the
middleware (spawned as a child process), and on boot applies the committed database migrations
against `DATABASE_URL` — waiting for the database with backoff and aborting (so the container
restarts) if a migration fails. The only configuration it needs is `DATABASE_URL`.

1. **Provision PostgreSQL.** In your Coolify project, add a PostgreSQL database (or use any external
   Postgres) and copy its connection string.
2. **Create the application.** New Resource → Application → connect this Git repository and branch →
   set the **Build Pack** to **Dockerfile** (Coolify uses the repo-root `Dockerfile`; no extra build
   configuration is required).
3. **Networking.** Expose container port **3000** and set the health check path to **`/healthz`**.
4. **Environment.** Add a single variable:

   ```
   DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
   ```

   (Coolify can inject the URL of a managed database for you.) The `POSTGRES_*` variables in
   `docker-compose.yml` are only for the local database and are **not** needed in Coolify.
5. **Deploy.** Coolify builds the multi-stage image and starts the gateway. Migrations are applied
   automatically on boot. Visit the app URL and check `GET /healthz` returns `{"status":"ok"}`.

### How it works in production

The gateway (`packages/gateway/server.js`) applies the committed migrations on boot (aborting if they
fail, so the container restarts and retries), then spawns the middleware, restarts it with exponential
backoff if it crashes, waits for its `/healthz` probe, and serves `packages/client/dist` with an
SPA fallback. Everything runs in one container.

**Smoke-test the production image locally:**

```bash
docker compose up --build      # gateway on http://localhost:3000, Postgres alongside
```

#### Deploying with the Docker Compose build pack

If you deploy this `docker-compose.yml` directly (instead of the Dockerfile build pack above),
the `db` service publishes Postgres on the host. On a shared Coolify host where another stack
already binds host port `5432` (e.g. [course-tracker](https://github.com/emilyeserven/course-tracker)),
this fails with `Bind for 0.0.0.0:5432 failed: port is already allocated`. Set a free host port
for this stack — the gateway still reaches Postgres internally at `db:5432`, so only the host-side
mapping changes:

```
POSTGRES_HOST_PORT=5433
GATEWAY_HOST_PORT=3000
```

## Releases

Versioning and `CHANGELOG.md` are automated by
[release-please](https://github.com/googleapis/release-please) from Conventional Commit messages.
Use `type(scope): description` (e.g. `feat: add sentence tagging`).
