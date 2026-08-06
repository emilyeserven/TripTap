/**
 * Small helpers shared by the row → wire-type mappers in `services/`.
 *
 * Every service converts its timestamps the same way, and before this the conversion was written
 * inline in each mapper (~47 times) with two identical private `toIso` helpers alongside. One
 * spelling means a timestamp is never accidentally serialized a second way.
 */

/**
 * A DB timestamp as an ISO-8601 string.
 *
 * The `instanceof Date` guard isn't defensive padding: `drizzle-orm` yields a `Date` for
 * `timestamp` columns but the raw string for `date` columns, and a few code paths hand back
 * whatever the driver returned. Both have to serialize to a string the client can parse.
 */
export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/** {@link toIso} for a nullable column: null stays null rather than becoming the string "null". */
export function toIsoOrNull(value: Date | string | null | undefined): string | null {
  return value == null ? null : toIso(value);
}
