import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/db/schema";

const {
  Pool,
} = pg;

const connectionString
  = process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/sentence_bank";

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, {
  schema,
});
