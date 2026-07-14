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
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
