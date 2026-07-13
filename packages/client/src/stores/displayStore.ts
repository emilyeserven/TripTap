import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Theme selection: `system` follows the OS `prefers-color-scheme`; light/dark are explicit choices. */
export type Theme = "system" | "light" | "dark";

/** Reading text size for the main content area (chrome stays fixed). */
export type TextSize = "regular" | "large" | "xl";

/** Content column width: `normal` keeps the centered max-width column, `wide` goes full-bleed. */
export type ContainerWidth = "normal" | "wide";

interface DisplayState {
  /** Light/dark theme; `system` tracks the OS preference until the user picks explicitly. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Reading size of the main content, scaled for better focus. */
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  /** When on, the sidebar is hidden entirely for a distraction-free view. */
  focusMode: boolean;
  setFocusMode: (on: boolean) => void;
  /** Whether the content column is constrained (`normal`) or spans the full width (`wide`). */
  containerWidth: ContainerWidth;
  setContainerWidth: (width: ContainerWidth) => void;
}

/**
 * Persisted display preferences (theme, text size, focus mode, content width), surfaced through the
 * header's Display Options popover. Uses Zustand's `persist` middleware so choices survive reloads;
 * localStorage access is guarded so private-mode / non-browser environments fall back to defaults.
 */
export const useDisplayStore = create<DisplayState>()(
  persist(
    set => ({
      theme: "system",
      setTheme: theme => set({
        theme,
      }),
      textSize: "regular",
      setTextSize: size => set({
        textSize: size,
      }),
      focusMode: false,
      setFocusMode: on => set({
        focusMode: on,
      }),
      containerWidth: "normal",
      setContainerWidth: width => set({
        containerWidth: width,
      }),
    }),
    {
      name: "triptap-display",
      storage: createJSONStorage(() => globalThis.localStorage),
    },
  ),
);

/**
 * Resolve a {@link Theme} to a concrete light/dark value, consulting the OS preference when set to
 * `system`. Safe to call outside a browser (defaults to light).
 */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  }
  return theme;
}
