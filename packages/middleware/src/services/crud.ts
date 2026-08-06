import { eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";

/**
 * The five-operation CRUD body shared by most of `services/`.
 *
 * Around twenty services were the same forty lines with the table and the two mappers swapped:
 * select-all-ordered, select-by-id, insert-returning, update-returning-with-`updatedAt`,
 * delete-returning-ids. Only the mappers were ever genuinely per-entity — they name every column,
 * so they stay hand-written; everything around them is now written once here.
 *
 * A service adopts this by building a `crudService` and re-exporting the operations under its own
 * names. Services with extra operations (a filtered list, a lookup by another column, a unique-
 * violation guard on create) keep those hand-written next to the shared ones, or wrap the shared
 * one — the factory is not all-or-nothing.
 */

/** A table this factory can drive: any `pgTable` with a scalar `id` column. */
export type CrudTable = PgTable & { id: PgColumn };

export interface CrudService<Wire, CreateInput, UpdateInput> {
  /**
   * All rows in the configured order, mapped to the wire type.
   *
   * `where` exists for the handful of features whose list takes an optional filter
   * (`?tutorId=`, `?questionSheetId=`). Passing it collapses what were two hand-written
   * branches — filtered and unfiltered — into one.
   */
  list: (where?: SQL) => Promise<Wire[]>;
  /** One row by id, or `null` when it doesn't exist. */
  get: (id: string) => Promise<Wire | null>;
  /** Insert one row and return it mapped. */
  create: (input: CreateInput) => Promise<Wire>;
  /** Insert many rows in one statement; an empty list is a no-op rather than an invalid insert. */
  createMany: (inputs: CreateInput[]) => Promise<Wire[]>;
  /** Patch one row; `null` when the id doesn't exist. */
  update: (id: string, input: UpdateInput) => Promise<Wire | null>;
  /** Delete one row; `false` when the id didn't exist. */
  remove: (id: string) => Promise<boolean>;
}

export interface CrudServiceOptions<T extends CrudTable, Wire, CreateInput> {
  /** Map a DB row to the feature's wire type. Per-entity by nature — it names every column. */
  toWire: (row: T["$inferSelect"]) => Wire;
  /**
   * Map a create input to the Drizzle insert shape (defaults, `?? null` coalescing).
   *
   * May be async: a couple of features derive a column on write (furigana generated from the
   * submitted text), and doing that inside the mapper keeps them on the shared insert path.
   */
  toInsert: (input: CreateInput) => T["$inferInsert"] | Promise<T["$inferInsert"]>;
  /** `orderBy` terms for `list`, e.g. `[desc(t.date), desc(t.createdAt)]`. */
  orderBy: SQL[];
  /**
   * Stamp `updatedAt` on every update. On by default because every table using this factory has
   * the column; pass `false` for one that doesn't, or the update fails at runtime.
   */
  touchUpdatedAt?: boolean;
}

/**
 * Build the five standard operations for `table`.
 *
 * `UpdateInput` defaults to `Partial<CreateInput>`, which is how every feature but a couple spells
 * it. The casts below are the one place the loss happens: Drizzle's builders resolve their row and
 * set-source types from a *concrete* table, and collapse to `never`-ish shapes behind a generic
 * `T extends PgTable`. Confining them here means the twenty call sites stay fully typed.
 */
export function crudService<
  T extends CrudTable,
  Wire,
  CreateInput,
  UpdateInput = Partial<CreateInput>,
>(
  table: T,
  {
    toWire, toInsert, orderBy, touchUpdatedAt = true,
  }: CrudServiceOptions<T, Wire, CreateInput>,
): CrudService<Wire, CreateInput, UpdateInput> {
  type Row = T["$inferSelect"];

  return {
    async list(where) {
      const query = db.select().from(table as PgTable);
      const rows = await (where ? query.where(where) : query).orderBy(...orderBy) as Row[];
      return rows.map(toWire);
    },

    async get(id) {
      const [row] = await db.select().from(table as PgTable).where(eq(table.id, id)) as Row[];
      return row ? toWire(row) : null;
    },

    async create(input) {
      const [row] = await db
        .insert(table)
        .values(await toInsert(input) as never)
        .returning() as Row[];
      return toWire(row);
    },

    async createMany(inputs) {
      if (inputs.length === 0) return [];
      const values = await Promise.all(inputs.map(input => toInsert(input)));
      const rows = await db
        .insert(table)
        .values(values as never)
        .returning() as Row[];
      return rows.map(toWire);
    },

    async update(id, input) {
      const set = touchUpdatedAt
        ? {
          ...input,
          updatedAt: new Date(),
        }
        : input;
      const [row] = await db
        .update(table)
        .set(set as never)
        .where(eq(table.id, id))
        .returning() as Row[];
      return row ? toWire(row) : null;
    },

    async remove(id) {
      const rows = await db.delete(table).where(eq(table.id, id)).returning({
        id: table.id,
      });
      return rows.length > 0;
    },
  };
}
