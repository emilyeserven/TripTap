import type { ReactNode } from "react";

/**
 * The look of a hub section's "View all →" / "View more →" link.
 *
 * A constant rather than a `<ViewAllLink to="…">` component on purpose, and for the same reason
 * `EntityDetailPage` takes its links as nodes: TanStack Router types `to` and `search` against the
 * generated route tree, so a wrapper taking `to: string` would trade real checking for nothing —
 * this is one class string. Three hub pages had it declared verbatim.
 */
export const VIEW_ALL_CLASS = "text-sm font-medium text-primary hover:underline";

/**
 * A titled section on a hub page: a header row (title + an optional action, e.g. a "View all →" link)
 * over its content. Purely presentational so callers keep type-safe `<Link>`s for their own routes.
 */
export function HubSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
