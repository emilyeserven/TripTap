---
name: bookmarks-api
description: >-
  The contract for the external "eeSimple Bookmarks" app that TripTap borrows vocabularies from — the
  upstream HTTP endpoints, the JSON shapes TripTap depends on, and how the middleware proxy
  (services/bookmarks/) maps them to wire types. Read this before changing anything under
  services/bookmarks/, routes/bookmarks.ts, the BookmarksSource/TagTermOption/BookmarkRecord/
  BookmarkResource types, TermPicker, or the Settings bookmarks card. The host is a Tailnet-only,
  no-auth service you cannot reach from a dev box or CI, so this doc is the source of truth for its
  API — you do not need live access to it to make changes.
---

# Bookmarks app API

TripTap tags its own content (sentences, question sheets, grammar notes, listening/shadowing sessions)
with terms **borrowed from an external app** — a personal bookmarks manager the user calls
**"eeSimple Bookmarks"**. That host owns tags, taxonomies, and bookmark records; TripTap never stores
its vocabulary, it re-reads it on demand through a server-side proxy.

**Why this skill exists:** the bookmarks host is **Tailnet-only and unauthenticated** (default
`https://eserve-raspi.seahorse-butterfly.ts.net`). You can't curl it from a dev machine, CI, or a web
session, so you can't discover its API by poking at it. This file records the contract TripTap relies
on so you can change the integration without live access. If you ever *do* have Tailnet access and find
the host's behavior has drifted from what's written here, update this file in the same PR.

## The three layers

```
eeSimple Bookmarks host          TripTap middleware proxy              TripTap client
(external, Tailnet-only)         packages/middleware/src/              packages/client/src/
  GET /api/tags            ──▶   services/bookmarks/index.ts    ──▶    hooks/useBookmarks.ts
  GET /api/taxonomies            routes/bookmarks.ts                   components/TermPicker.tsx
  GET /api/bookmarks?tags=       (mounts /api/bookmarks/*)             components/Bookmarks*Card
  POST /api/tags  … etc.         mappers.ts / config.ts / util.ts      Settings bookmarks card
```

- **Upstream host** — loose JSON, many fields TripTap ignores. Its contract is in
  `references/upstream-api.md`. Never assume a field exists beyond what's listed there; the mappers are
  deliberately defensive (every field is type-checked, unreadable objects become `null`).
- **Middleware proxy** (`services/bookmarks/`) — the *only* thing that talks to the host. Browser
  traffic never reaches the Tailnet directly. Routes are mounted under `/api/bookmarks/*`
  (`routes/bookmarks.ts`). All host access funnels through `fetchBookmarksJson` / `fetchBookmarksImage`
  (`util.ts`), which apply a 10s abort timeout and map failures to domain errors.
- **Client** — talks only to TripTap's own `/api/bookmarks/*`, never the host.

## Key files (middleware, `packages/middleware/src/services/bookmarks/`)

| File | Responsibility |
|---|---|
| `index.ts` | Orchestration: one exported function per operation. The only file that composes host calls. |
| `mappers.ts` | **Pure** upstream-JSON → wire-type mappers (`toOption`, `toTaxonomy`, `toBookmarkRecord`, `toBookmarkResource`, `flattenTimestampSections`). Side-effect free. |
| `config.ts` | Resolves the effective base URL + per-channel source. Endpoint precedence: **DB Settings → `BOOKMARKS_API_URL` → hardcoded default**. `apiUrl()` normalizes the base and appends `/api<path>`. |
| `util.ts` | `fetchBookmarksJson` / `fetchBookmarksImage` — timeout + error mapping. |
| `errors.ts` | `BookmarksNotConfiguredError` → HTTP 503; `BookmarksUnavailableError` → HTTP 502. |

Wire types live in `packages/types/src/index.ts` (search "Bookmarks tag/taxonomy integration").

## The two vocabulary systems (this is the crux)

The host has **two independent id spaces**, and every operation branches on which one a channel uses.
A `BookmarksSource` has `kind: "tag" | "taxonomy"`:

- **`kind: "tag"`** — the source is a **parent tag**; its **direct children** (`parentId === source.id`)
  are the selectable vocabulary. Bookmarks are found with `GET /api/bookmarks?tags=<tagId>` — this query
  param **only matches tag ids**.
- **`kind: "taxonomy"`** — the source is a **taxonomy**; its **terms** are the vocabulary. A taxonomy may
  optionally *drill into one parent term* (`termId`/`termLabel`) so only that term's children are offered
  and new terms nest under it. Crucially, `?tags=` **never matches taxonomy term ids** — to find
  bookmarks by taxonomy term you must read the **assignment map**
  (`GET /api/taxonomy-assignments/by-owner-type/<taxonomyId>/bookmark`) and reverse it.

When you add a feature that resolves bookmarks for a source, you must handle **both** branches (see
`listRawBookmarksForSource` in `index.ts` for the canonical pattern). Getting only the tag branch right
is the most common way to silently break taxonomy-backed channels.

## Channels

Four channels (`SentenceTermCategory`): `vocabulary`, `grammar`, `general`, `resource`. Each has its own
independently configured source (`source` / `grammarSource` / `generalSource` / `resourceSource` in
`BookmarksSettings`), its own Settings picker, and its own sentence-form `TermPicker`. Terms are stored
on TripTap content as `SentenceTermRef[]` stamped with `category`; rows predating the field default to
`vocabulary`.

> Note: a stale doc comment in `types/src/index.ts` mentions a fifth "listening" channel — the enum only
> has the four above. Treat the enum as authoritative; don't add `listening` unless you're intentionally
> building that channel end to end.

## Failure model

- **No endpoint resolvable** → `BookmarksNotConfiguredError` → **503**.
- **Host unreachable / timeout / non-2xx** → `BookmarksUnavailableError` → **502**.
- **Unreadable individual object** → the mapper returns `null` and the item is filtered out; the request
  as a whole still succeeds. Degrade gracefully, never throw on one bad row (e.g. `listBookmarkResources`
  lets a failed custom-property lookup fall back to `runtimeSeconds: null` rather than 500-ing).

## Making changes without host access

1. **Read `references/upstream-api.md`** for the exact request/response shapes — that's the contract you
   code against.
2. **New host operation** → add a function to `index.ts`, keep the JSON→type mapping in `mappers.ts`
   (pure, defensively typed), route through `fetchBookmarksJson`, and handle both source kinds if it
   resolves a source.
3. **New proxy endpoint** → add it in `routes/bookmarks.ts` with an inline JSON schema and the shared
   `handleError` mapper; register nothing else (the plugin is already wired in `app.ts`).
4. **Tests** (`services/bookmarks/*.test.ts`, `routes/*.test.ts`) run **without the host** — they stub
   `fetch` / the fetch helpers. Assert against the shapes in the reference doc, not a live response.
5. If you learn something new about the host's real behavior, **write it into `references/upstream-api.md`**
   so the next change doesn't need access either.
