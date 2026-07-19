import type { ReactNode } from "react";

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
