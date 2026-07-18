# sentence-bank — Architecture & Conventions

## Project summary

A full-stack TypeScript monorepo: a personal **Japanese language-learning workspace**. The original
"bank of example sentences" is now just the seed feature — the app spans ~25 feature areas (lessons,
AI-generated lessons, answer/question sheets, drill/listening/reading/shadowing sessions, writing +
corrections, tutors, sources, vocab/grammar/culture, OCR capture, Anki/Renshuu export) backed by ~28
database tables. See **Domain map** below before hunting for where something lives. Built with pnpm
workspaces, mirroring the tooling and architecture of
[course-tracker](https://github.com/emilyeserven/course-tracker).

> **Naming:** the product/repo is **TripTap**, but the internal package scope, the API title, and this
> doc's history use the older name **`sentence-bank`** (`@sentence-bank/*`). They refer to the same
> project; don't "fix" the mismatch without an intentional, repo-wide rename.

## Tech stack

- **Runtime & build:** Node 22, pnpm 10, TypeScript 5.9 (strict, ES2022, `moduleResolution: bundler`)
- **Frontend:** React 19, Vite, TanStack Router/Query/Form, Tailwind CSS 4
- **Backend:** Fastify 5, Drizzle ORM, PostgreSQL, Swagger UI
- **Testing:** Vitest + Testing Library (client), Node test runner (middleware)

## Monorepo layout

Four packages under `packages/`:

- **types** (`@sentence-bank/types`) — shared TypeScript definitions; builds to `dist`.
- **middleware** (`@sentence-bank/middleware`) — Fastify API. Layered `src/`: `db/` (Drizzle schema +
  client + seed), `routes/`, `services/`, `tests/`, `app.ts`, `index.ts`.
- **client** (`@sentence-bank/client`) — React frontend. `src/`: `routes/` (file-based), `components/`,
  `hooks/`, `lib/`, `stores/`, `test-utils/`.
- **gateway** (`@sentence-bank/gateway`) — Fastify reverse proxy, the production entrypoint (`server.js`).

Build order: types → middleware → client. The gateway has no build step.

## Domain map

Each feature is a **vertical slice** with a very consistent shape — learn it once and every feature is
navigable:

```
packages/types/src/<feature>.ts        # wire contract: <Entity> + Create<Entity>Input + Update<Entity>Input
packages/middleware/src/routes/<f>.ts  # Fastify plugin `xRoutes` (inline JSON schemas); registered in app.ts
packages/middleware/src/services/<f>.ts# all Drizzle/DB access lives here (routes never touch the db directly)
packages/middleware/src/db/schema.ts   # the pgTable(s) for the feature
packages/client/src/hooks/useX.ts      # TanStack Query wrapper over the API
packages/client/src/routes/<f>.*.tsx   # file-based TanStack Router: <f>.index / <f>.new / <f>.$id(.index/.edit)
packages/client/src/components/X*.tsx  # XForm / XCard / XView for the feature
```

Multi-table or external-proxy features use a service **directory** instead of a single file
(`services/bookmarks/`, `services/ocr/`). Middleware resolves `@/*` → `src/*`.

| Feature | Client route(s) | MW route / service | What it is |
|---|---|---|---|
| Sentences (bank) | `sentences.tsx` | `sentences.ts` (+ `sentence-vocab`, `furigana`) | Core example-sentence bank; furigana + terms. |
| My Sentences | `my-sentences.*` | `my-sentences.ts` | Learner-produced sentences in a needs-correction flow. |
| Practice | `practice.*` | `practice-sentences.ts` (+ `practice-sentence-vocab`) | Study-aid cards: passes, word/grammar breakdowns. |
| Writings / My Writing | `my-writing.*` | `writings.ts` | Free writing with inline corrections (promotable to My Sentences). |
| Writing Prompts | `writing-prompts.*` | `writing-prompts.ts` | Reusable prompts, snapshotted onto a writing. |
| Lessons | `lessons.*` | `lessons.ts` | Tutor-lesson records: sections, word notes, linked answer sheets. |
| AI Lessons | `ai-lessons.*` | `ai-lessons.ts` | AI-generated bundles: vocab, grammar, source sentences, culture cards. |
| Grammar / Culture | `grammar.tsx`, `culture.tsx` | *(read AI-lesson content; no own route)* | Cross-lesson views over AI-lesson data. |
| Vocab | `vocabulary.tsx` (`vocab.tsx` redirects) | `vocab.ts` | Standalone vocab bank, unified with AI-lesson vocab. |
| Answer Sheets | `answer-sheets.*` | `answer-sheets.ts` | Filled-in answers to a question sheet, with corrections. |
| Question Sheets / Book Exercises | `question-sheets.*`, `book-exercises.index.tsx` | `question-sheets.ts` | Worksheet/exercise definitions; optional Textbooks bookmark + due date. |
| Drill Sessions | `drill-sessions.*` (`reasons`, `stats`) | `drill-sessions.ts`, `drill-reason-categories.ts` | Timed drills logging mistakes against a shared reason taxonomy. |
| Listening Sessions | `listening-sessions.*` | `listening-sessions.ts` | Listen-along on a bookmark video + timestamped notes. |
| Shadowing Sessions | `shadowing.*` | `shadowing-sessions.ts` | Listen-and-shadow with segment loops + timestamped notes. |
| Reading Sessions | `reading-sessions.*` | `reading-sessions.ts` | Reading logs: translation/summary + shaky-word notes. |
| Tutors | `tutors.*` | `tutors.ts` | Lightweight person entity that lessons associate with. |
| Sources | `sources.*` | `sources.ts` | Source taxonomy (book/show/article) referenced by sentences, vocab, captures. |
| Captures / OCR | `capture.tsx`, `captures.*` | `captures.ts`, `ocr.ts`, `parse-templates.ts` | Image → OCR → cleaned-blocks workbench → mine sentences/vocab. |
| Anki / Renshuu | `anki.tsx`, `renshuu.tsx` | *(client-only; `lib/anki.ts`, `lib/renshuu.ts`)* | Export bank rows to Anki TSV / Renshuu bulk-import. |
| Migaku Import | `migaku-import.*` | `migaku-import.ts` → `services/migaku/` | Upload a Migaku/Anki `.apkg`, review parsed cards, commit to sentences/vocab with media in S3/Garage (`services/media/`). The Migaku "Sentence" note type (`migaku-model.ts`, detected by `isMigakuModel`) maps each note to a **focus Vocab + its example Sentence(s), linked via `sentence_vocab`** — grouped review UI (`MigakuNoteReview`); any other `.apkg` uses the generic single-row path (`MigakuCandidateTable`). |
| Settings | `settings.tsx` | `settings.ts` | OCR keys + Renshuu key (masked) + bookmarks channel config; DB overrides env. |
| Renshuu examples | *(Renshuu tab in the drill-mistake "Find examples" picker)* | `renshuu.ts` → `services/renshuu/` | Read-only proxy to renshuu.org's example-sentence bank (`/v1/reibun/search`, Bearer key); import a result into the bank. |
| Bookmarks | *(pickers/cards in forms + settings)* | `bookmarks.ts` → `services/bookmarks/` | Proxy to the external bookmarks app for tag/taxonomy terms (see below). |

Root layout is `routes/__root.tsx`; the homepage/dashboard is `routes/index.tsx`. The Swagger UI at
`/docs` (built in `app.ts`) is the fastest way to see the full live API surface and its tags.

**Client cross-cutting bits:** Zustand `stores/` (`displayStore` theme/text-size/furigana prefs,
`uiStore` study level, `pageTitleStore` via `usePageTitle`); the TipTap code in `lib/tiptap/` is a
**track-changes correction editor** (`CorrectMark`/`IncorrectMark`, `trackChanges.ts`), not general
prose — consumed by `SentenceCorrector`. The middleware `services/furigana.ts` wraps kuroshiro and
emits a compact `FuriToken[]` so the client renders `<ruby>` without trusting raw HTML.

## Key commands

```
pnpm dev              # Postgres (Docker) + apply migrations + all packages concurrently
pnpm build            # build types → middleware → client
pnpm test             # run all tests
pnpm typecheck        # strict type checks
pnpm lint:fix         # auto-fix ESLint issues (always run from the repo root)
pnpm verify:changed   # lint/typecheck/test only changed packages
pnpm fallow           # dead-code / duplication / complexity audit
pnpm studio           # Drizzle Studio
pnpm db:generate      # generate a versioned SQL migration from the schema (commit the result)
pnpm db:migrate       # apply committed migrations to the local database
```

Package-scoped commands use `pnpm --filter=@sentence-bank/<name>`.

**Fresh checkout / web session:** run `pnpm install` then build the shared types once
(`pnpm --filter=@sentence-bank/types build`) — middleware and client resolve `@sentence-bank/types`
to its `dist/` output, so tests and typecheck fail until it exists. `pnpm typecheck` builds types
itself; `pnpm test` does not.

**Tests need no database.** The middleware suite uses Fastify `inject` + JSON-schema validation, so
`pnpm test` runs without Postgres. A handful of endpoint tests intentionally exercise a valid payload
and assert only that it isn't rejected (status ≠ 400); without a DB these log a connection error but
still pass. The two suites that require a live DB are gated behind `RUN_DB_TESTS=1`.

## Conventions

- **ESLint** uses the flat config in `eslint.config.js`, which re-exports
  `@emilyeserven/eslint-config`. Run `pnpm lint:fix` from the repo root — running from a package
  produces import ordering that CI rejects.
- **Conventional Commits** are enforced by commitlint (commit-msg hook) and the `pr-title` workflow.
  Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
  `revert`. release-please derives `CHANGELOG.md` and version bumps from them.
  - **The PR title itself must be a valid Conventional Commit** (e.g. `feat(client): add resource
    thumbnails`), not a prose sentence like "Add resource thumbnails" — the `pr-title` workflow
    (`amannn/action-semantic-pull-request`) lints the **title**, which fails independently of the
    commit messages. When a PR is opened (or auto-titled by a tool), set/rename the title to
    `<type>(optional-scope): <summary>` before relying on the check. Squash-merge titles inherit the
    PR title, so a bad title also pollutes `main`'s history and the changelog.
- **Git hooks** (Husky): pre-commit runs `lint-staged`; commit-msg runs commitlint.
- **Path alias:** the middleware uses `@/*` → `src/*` (resolved at build time by `tsc-alias`).

## Generated files (do not edit)

- `packages/client/src/routeTree.gen.ts` — regenerate with `pnpm --filter=@sentence-bank/client routeTree`
  (also auto-regenerated by the Vite plugin during `dev`/`build`).
- `packages/middleware/drizzle/**` — versioned SQL migrations + `meta/_journal.json`. Regenerate with
  `pnpm db:generate` after a schema change; commit them. Never hand-edit the journal.
- `pnpm-lock.yaml` — only `pnpm install` should modify it.

## Database migrations

Schema changes are **versioned**, not pushed. Edit `packages/middleware/src/db/schema.ts`, run
`pnpm db:generate` to emit a new `drizzle/NNNN_*.sql`, and commit it. Migrations are applied by the
gateway on boot via `packages/middleware/src/db/migrate.ts` (drizzle-orm's `migrate()`), which waits
for Postgres with backoff and **exits non-zero if a migration fails** — so the container restarts and
retries rather than serving against an un-migrated database. `drizzle-kit` is a dev-only dependency;
it is not needed at runtime.

## Deployment

The **gateway pattern** uses `packages/gateway` as the single production entrypoint: a Fastify
server that spawns the middleware as a child process, proxies `/api/*` to it, serves the client's
static build, applies versioned migrations on boot (failing hard so the container restarts on error),
and respawns the middleware with backoff. The root `Dockerfile` builds everything for production.
Deploy via Coolify using only `DATABASE_URL` (see `README.md`).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | middleware / gateway | PostgreSQL connection string |
| `POSTGRES_USER` | docker-compose | DB user (default: `postgres`) |
| `POSTGRES_PASSWORD` | docker-compose | DB password (default: `password`) |
| `POSTGRES_DB` | docker-compose | DB name (default: `sentence_bank`) |
| `POSTGRES_HOST_PORT` | docker-compose | Host port mapped to the db container's 5432 (default: `5432`). Override to avoid host port collisions on a shared host. |
| `GATEWAY_HOST_PORT` | docker-compose | Host port mapped to the gateway's 3000 (default: `3000`). |
| `OCR_SERVICE_URL` | middleware | Self-hosted OCR backend base URL (`ocr-service/`) for the Capture feature, e.g. `http://192.168.1.50:8422`. |
| `OCR_SPACE_API_KEY` | middleware | OCR.space cloud backend key (free tier). Overridden by the Settings-page value stored in the DB. Optional: `OCR_SPACE_ENGINE`, `OCR_SPACE_LANGUAGE`, `OCR_SPACE_URL`. |
| `GOOGLE_VISION_API_KEY` | middleware | Google Cloud Vision backend API key. Overridden by the Settings-page value stored in the DB. Optional: `GOOGLE_VISION_URL`. |
| `OCR_PROVIDERS` | middleware | Comma-separated OCR backend order/selection (`self-hosted`, `ocr-space`, `google-vision`). Unset → all configured backends, self-hosted first. |
| `BOOKMARKS_API_URL` | middleware | Base URL of the external bookmarks tag/taxonomy API borrowed to tag sentences. Overridden by the Settings-page value stored in the DB; unset falls back to a built-in default. Must be reachable from the middleware (e.g. same Tailnet). |
| `TATOEBA_API_URL` | middleware | Optional override for the Tatoeba base URL (default `https://tatoeba.org`; the service calls its `/en/api_v0/search` endpoint, the only one that returns furigana transcriptions). Backs "Find examples" when adding a My Sentence from a drill mistake. No auth. |
| `RENSHUU_API_KEY` | middleware | The learner's renshuu.org API key, backing the "Renshuu" tab of "Find examples" on a drill mistake (`/api/renshuu/search`). The Settings-page value (masked, DB-stored) overrides this; both optional. Unset → 503. |
| `RENSHUU_API_URL` | middleware | Optional override for the Renshuu API base URL (default `https://api.renshuu.org`; the service calls `/v1/reibun/search` with a Bearer token). |
| `S3_ENDPOINT` | middleware | S3-compatible (Garage) endpoint storing audio/image from Migaku `.apkg` imports. Unset → the Migaku import feature returns 503. |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | middleware | Credentials for the media bucket. Scope the key to TripTap's own bucket. |
| `S3_BUCKET` | middleware | Dedicated media bucket (e.g. `triptap-media`); the reconciliation sweep deletes anything unreferenced in it, so it must be TripTap-only. |
| `S3_REGION` | middleware | S3 region label (default `garage`). |
| `S3_FORCE_PATH_STYLE` | middleware | Path-style addressing (default `true`; required for Garage). |

The bookmarks integration borrows vocabularies from the external app across **four independent
channels** — Vocabulary, Grammar, General, and Textbooks & Worksheets (the `resource` channel)
(`SentenceTermCategory`), each with its own configured source stored under `bookmarks.source` /
`bookmarks.grammarSource` / `bookmarks.generalSource` / `bookmarks.resourceSource`
(`services/settings.ts`). A source is a parent tag (its children are the choices) or a taxonomy (its
terms are the choices); a taxonomy source may optionally **drill into one parent term** (`termId`/
`termLabel`), so only that term's children are offered and new terms nest under it. Sentences store the
picked terms as `SentenceTermRef[]` in a `jsonb` column, each stamped with its `category` (older rows
without one default to Vocabulary — no migration needed). The middleware proxies all host calls under
`/api/bookmarks/*`: `GET /vocabulary?category=…` resolves a channel's choices, and
`POST /api/bookmarks/terms` creates a new term/tag in the bookmarks app under the channel's source
(`createVocabularyTerm` in `services/bookmarks/index.ts`). `BookmarksNotConfigured` → 503,
`BookmarksUnavailable` → 502. The Settings UI is `BookmarksTagsCard`; the sentence-form pickers are
`TermPicker` (one per channel). The separate free-text `tags` string field is unrelated.

The Capture feature tries the configured OCR backends in order with automatic fallback; `/api/ocr`
returns 503 only when **none** are configured. The pluggable seam is `runOcr()` in
`packages/middleware/src/services/ocr/` (one file per provider + an orchestrator `index.ts`), which
per request resolves an `OcrConfig` by merging the DB-stored cloud keys (Settings page, via
`services/settings.ts` + the `settings` table) over the env vars. The Settings UI lives at
`packages/client/src/routes/settings.tsx` (`OcrKeysCard`), backed by `/api/settings/ocr` — the GET
returns only masked hints, never raw secrets.

See `packages/middleware/.env.example`.
