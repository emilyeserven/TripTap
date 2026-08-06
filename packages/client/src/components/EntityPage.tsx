import type { ReactNode } from "react";

import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The shared shell for an entity's detail and edit pages.
 *
 * Every `<feature>.$id.index.tsx` and `<feature>.$id.edit.tsx` opened with the same three guards
 * and the same header row, differing only in nouns. Fourteen copies each, and the guards were
 * byte-identical — so a change to how loading or failure reads had fourteen places to land.
 *
 * Routing stays at the call site on purpose. TanStack Router types `to` and `params` against the
 * generated route tree, so a shell taking `to: string` would trade real type-safety for a few
 * saved lines. The pages pass their already-typed `<Link>`s in as nodes instead.
 */

/** The subset of a TanStack query these pages read. */
export interface EntityQuery<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Render `children` once the entity has loaded, or the matching loading / error / not-found
 * message. `noun` names the entity in the not-found message, e.g. "Tutor".
 */
export function EntityPageState<T>({
  query, noun, children,
}: {
  query: EntityQuery<T>;
  noun: string;
  children: (data: T) => ReactNode;
}) {
  const {
    data, isLoading, error,
  } = query;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">{noun} not found.</p>;
  return <>{children(data)}</>;
}

/** A ghost "back" button wrapping a caller-supplied, route-typed `<Link>`. */
export function BackButton({
  children,
}: { children: ReactNode }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
    >
      {children}
    </Button>
  );
}

/**
 * An entity's read-only page: guards, a back link, an edit link, then the view.
 *
 * `backLink` and `editLink` are `<Link>` elements built by the caller so their `to`/`params` stay
 * checked against the route tree; this only supplies the button chrome and the labels' icons.
 */
export function EntityDetailPage<T>({
  query,
  noun,
  backLink,
  editLink,
  children,
}: {
  query: EntityQuery<T>;
  noun: string;
  /** A route-typed `<Link>` back to the list, e.g. `<Link to="/tutors">All tutors</Link>`. */
  backLink: ReactNode;
  /** A route-typed `<Link>` to the edit page. Omit for entities with no edit route. */
  editLink?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  return (
    <EntityPageState
      query={query}
      noun={noun}
    >
      {data => (
        <section className="max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <BackButton>{backLink}</BackButton>
            {editLink
              ? (
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    {editLink}
                  </Button>
                </div>
              )
              : null}
          </div>
          {children(data)}
        </section>
      )}
    </EntityPageState>
  );
}

/**
 * An entity's edit page: guards, a back link, a delete button, then the form.
 *
 * The delete button is wired by the caller (`onDelete`) rather than here, because what a delete
 * navigates to is per-feature and route-typed.
 */
export function EntityEditPage<T>({
  query,
  noun,
  backLink,
  onDelete,
  deletePending = false,
  children,
}: {
  query: EntityQuery<T>;
  noun: string;
  backLink: ReactNode;
  onDelete: () => void;
  deletePending?: boolean;
  children: (data: T) => ReactNode;
}) {
  return (
    <EntityPageState
      query={query}
      noun={noun}
    >
      {data => (
        <section className="max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <BackButton>{backLink}</BackButton>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={deletePending}
              onClick={onDelete}
            >
              Delete
            </Button>
          </div>
          {children(data)}
        </section>
      )}
    </EntityPageState>
  );
}

/** The back-arrow icon, so pages don't each import it just to build their link's label. */
export { ArrowLeft as BackIcon, Pencil as EditIcon };
