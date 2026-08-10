/** True when a due date (ISO string) is in the past relative to `now`. */
export function isOverdue(dueDate: string, now: Date): boolean {
  return new Date(dueDate).getTime() < now.getTime();
}

/** True when a due date has passed, or falls within the next `days` days. */
export function isDueSoon(dueDate: string, now: Date, days: number): boolean {
  const horizon = now.getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(dueDate).getTime() <= horizon;
}

/** Short human-readable date for a due-date badge, e.g. "Aug 1, 2026". */
export function formatDueDate(dueDate: string): string {
  // Due dates and answer dates are whole calendar days stored as UTC midnight (`2026-08-01T00:00:00Z`).
  // Format that UTC day directly — converting to the viewer's local zone would shift the badge a day
  // earlier for anyone west of UTC (e.g. "Aug 1" showing as "Jul 31").
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Today's **local** calendar day encoded the way calendar-day fields are stored: UTC midnight of that
 * day (`2026-08-10T00:00:00.000Z`). Use this to default a date field so the stored day matches the
 * learner's wall clock, not UTC — creating an answer at 8pm EDT on the 9th stores the 9th, not the
 * 10th. Round-trips through the date input's `slice(0, 10)` and the XP day-key slice unchanged.
 */
export function todayCalendarDayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}
