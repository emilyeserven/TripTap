import { useLayoutEffect } from "react";

import { usePageTitleStore } from "@/stores/pageTitleStore";

/**
 * Publish the current page's title into the shared header strip (`routes/__root.tsx`). Pass an empty
 * string while data-derived titles are still loading. Uses `useLayoutEffect` so the strip updates in
 * the same frame the route body swaps (no stale-title flicker on navigation); the cleanup clears the
 * title so a route that sets none doesn't inherit the previous page's.
 */
export function usePageTitle(title: string) {
  const setTitle = usePageTitleStore(s => s.setTitle);
  useLayoutEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);
}
