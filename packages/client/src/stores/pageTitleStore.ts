import { create } from "zustand";

/**
 * Transient page-title state feeding the app header strip. Each route publishes its title through
 * {@link usePageTitle}; the header in `routes/__root.tsx` subscribes and renders it in place of the
 * app brand. Not persisted — it's derived fresh from whichever route is mounted.
 */
interface PageTitleState {
  /** Title of the currently mounted page; empty string when no route has set one. */
  title: string;
  setTitle: (title: string) => void;
}

export const usePageTitleStore = create<PageTitleState>(set => ({
  title: "",
  setTitle: title => set({
    title,
  }),
}));
