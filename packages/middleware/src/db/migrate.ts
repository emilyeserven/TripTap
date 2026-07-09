import "dotenv/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const {
  Pool,
} = pg;

const connectionString
  = process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/sentence_bank";

// The committed SQL lives at `packages/middleware/drizzle`. This file resolves the same way whether
// it runs from `src/db/` (tsx, dev) or `dist/db/` (node, production).
const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(here, "..", "..", "drizzle");

const CONNECT_ATTEMPTS = 10;
const INITIAL_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for Postgres to accept connections before migrating. On a mostly-unattended Raspberry Pi the
 * database and app often start together (or the DB is on slow storage), so the first connection can
 * fail transiently; retry with backoff instead of giving up.
 */
async function waitForDatabase(pool: pg.Pool): Promise<void> {
  let delay = INITIAL_DELAY_MS;
  for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      return;
    }
    catch (err) {
      if (attempt === CONNECT_ATTEMPTS) throw err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[migrate] database not ready (attempt ${attempt}/${CONNECT_ATTEMPTS}): ${message}; retrying in ${delay}ms`,
      );
      await sleep(delay);
      delay = Math.min(delay * 2, MAX_DELAY_MS);
    }
  }
}

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString,
    max: 1,
  });
  try {
    await waitForDatabase(pool);
    console.log("[migrate] applying migrations…");
    await migrate(drizzle(pool), {
      migrationsFolder,
    });
    console.log("[migrate] migrations up to date.");
  }
  finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] migration failed:", err);
    process.exit(1);
  });
