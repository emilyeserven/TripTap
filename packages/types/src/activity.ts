/**
 * Shared "Daily activity log" domain types.
 *
 * The activity feed is a per-day breakdown of the same derived XP the summary reports (see
 * {@link ./xp.js}), grouped by calendar day. Each day lists the individual pieces of work that earned
 * XP that day, each linking back to the row that produced it. Consumed by both the Fastify API and the
 * React client (the Learner Profile's Activity tab).
 */

import type { XpFeature } from "./xp.js";

/** One piece of XP-earning work on a given day. */
export interface ActivityItem {
  /** Which feature produced this XP (drills, reading, theory study, …). */
  type: XpFeature;
  /** The id of the row that produced it, or null when the source isn't a single addressable row. */
  id: string | null;
  /** A display title for the source, or null when it has none. */
  title: string | null;
  /** XP earned by this item on this day (grants from the same source on the day are summed). */
  xp: number;
  /** Router link target for the source, when it has an addressable page. */
  to?: string;
  /** Router link params for {@link to}. */
  params?: Record<string, string>;
}

/** All the XP-earning work on one calendar day, newest day first in the feed. */
export interface ActivityDay {
  /** The calendar day (YYYY-MM-DD). */
  date: string;
  /** Total XP earned across the day's items. */
  totalXp: number;
  /** The individual pieces of work, highest-XP first. */
  items: ActivityItem[];
}
