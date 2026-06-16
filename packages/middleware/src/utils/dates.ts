/**
 * Returns true when both strings parse as dates and `endDate` is on or after `startDate`.
 * Used to validate trip date ranges beyond what JSON-schema can express.
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end >= start;
}
