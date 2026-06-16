/**
 * Shared TripTap domain types.
 *
 * These are consumed by both the Fastify API (`@triptap/middleware`) and the React client
 * (`@triptap/client`) so the wire contract stays in one place.
 */

/** A single trip being tracked. */
export interface Trip {
  id: string;
  /** Human-friendly trip name, e.g. "Summer in Lisbon". */
  name: string;
  /** Primary destination (city, country, region, ...). */
  destination: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  startDate: string;
  /** ISO-8601 date string (YYYY-MM-DD). */
  endDate: string;
  /** Optional free-form notes. */
  notes: string | null;
  /** ISO-8601 timestamp of when the trip was created. */
  createdAt: string;
}

/** Payload for creating a trip. */
export interface CreateTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}

/** Payload for partially updating a trip. */
export type UpdateTripInput = Partial<CreateTripInput>;

/** Standard error shape returned by the API. */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
