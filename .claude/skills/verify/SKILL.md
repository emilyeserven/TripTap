---
name: verify
description: Build and run the full TripTap stack (scratch Postgres + gateway + built client) and drive it in headless Chromium to verify client/middleware changes end-to-end.
---

# Verifying TripTap end-to-end

## Build + launch the production stack

```bash
pnpm install
pnpm --filter @sentence-bank/types build
pnpm --filter @sentence-bank/middleware build
pnpm --filter @sentence-bank/client build
```

No Docker in web sessions, but Postgres 16 is installed. Run a scratch cluster as `nobody`
(pg refuses root; `nobody` can't traverse the scratchpad path, so use a /tmp dir):

```bash
mkdir -p /tmp/claude-pg && chown nobody /tmp/claude-pg
su -s /bin/bash nobody -c "/usr/lib/postgresql/16/bin/initdb -D /tmp/claude-pg/data -U postgres"
su -s /bin/bash nobody -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/claude-pg/data \
  -o '-p 5433 -k /tmp/claude-pg -c listen_addresses=127.0.0.1' -l /tmp/claude-pg/pg.log start"
/usr/lib/postgresql/16/bin/createdb -h 127.0.0.1 -p 5433 -U postgres sentence_bank
```

Then the real production entrypoint (applies migrations, spawns middleware on :3001, serves client):

```bash
cd packages/gateway
DATABASE_URL="postgres://postgres@127.0.0.1:5433/sentence_bank" PORT=3000 node server.js
```

`curl localhost:3000/healthz` → `{"status":"ok"}`; app at `http://localhost:3000`.

## Gotchas

- **Restart the gateway after every client rebuild.** `@fastify/static` with `wildcard: false`
  registers one route per file at boot; new hashed assets from a later build 404 into the SPA
  fallback and come back as `text/html` (broken module MIME errors). A rebuild + gateway restart
  is also exactly how a production deploy behaves.
- Kill the gateway by PID from `ps aux | grep "node server.js"` — it spawns the middleware as a
  child (`middleware/dist/index.js`) that must be killed too or the next boot hits EADDRINUSE
  on 3001 (the gateway will respawn-loop instead of failing).

## Driving the app headlessly

`npm i playwright-core` in the scratchpad; launch with
`executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"` (the bare
`/opt/pw-browsers/chromium` path is a directory without the binary — check `ls /opt/pw-browsers`
for the current numbered dir). Fresh Playwright contexts have clean service-worker state.

## PWA update flow specifically

To exercise "Check for updates" → "Update available" → reload: load the page, then make a
trivial client change, `pnpm --filter @sentence-bank/client build`, **restart the gateway**, and
click "Check for updates" in the still-open page. The sidebar-footer button and the sonner toast
are driven by `usePwaStore`; the SW plumbing is `src/lib/registerPwa.ts` (prod-only via dynamic
import in `main.tsx`).
