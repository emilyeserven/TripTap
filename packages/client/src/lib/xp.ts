/** Format XP without float noise: quarter-point values keep their decimals, whole values drop them. */
export function formatXp(xp: number): string {
  return Number.isInteger(xp) ? String(xp) : xp.toFixed(2).replace(/\.?0+$/, "");
}
