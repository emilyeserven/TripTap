import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Theme selection: `system` follows the OS `prefers-color-scheme`; light/dark are explicit choices. */
export type Theme = "system" | "light" | "dark";

/** Reading text size for the main content area (chrome stays fixed). */
export type TextSize = "regular" | "large" | "xl" | "xxl";

/** Content column width: `normal` keeps the centered max-width column, `wide` goes full-bleed. */
export type ContainerWidth = "normal" | "wide";

/** Space between fields in super focus mode: increasing gaps. */
export type SuperFocusSpace = "s" | "m" | "l";

/**
 * Progress indicator shown at the bottom in slide mode: `none` hides it, `line` is a filling bar,
 * `boxes` is one box per field filled up to the current slide.
 */
export type SlideProgress = "none" | "line" | "boxes";

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
  /** Escalated focus: hides the sidebar and restyles form fields to full width with extra spacing. */
  superFocus: boolean;
  setSuperFocus: (on: boolean) => void;
  /** How much space super focus mode puts between fields. */
  superFocusSpace: SuperFocusSpace;
  setSuperFocusSpace: (space: SuperFocusSpace) => void;
  /**
   * Slide mode: full-width stacked fields, one field per full-screen panel with scroll snapping,
   * Tab/arrow navigation, and an optional progress indicator. Independent of super focus.
   */
  slideMode: boolean;
  setSlideMode: (on: boolean) => void;
  /** Which progress indicator slide mode shows at the bottom. */
  slideProgress: SlideProgress;
  setSlideProgress: (progress: SlideProgress) => void;
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
      superFocus: false,
      setSuperFocus: on => set({
        superFocus: on,
      }),
      superFocusSpace: "s",
      setSuperFocusSpace: space => set({
        superFocusSpace: space,
      }),
      slideMode: false,
      setSlideMode: on => set({
        slideMode: on,
      }),
      slideProgress: "line",
      setSlideProgress: progress => set({
        slideProgress: progress,
      }),
      containerWidth: "normal",
      setContainerWidth: width => set({
        containerWidth: width,
      }),
    }),
    {
      name: "triptap-display",
      storage: createJSONStorage(() => globalThis.localStorage),
      version: 1,
      // v0 stored the slideshow behaviour as superFocusSpace: "xl"; it is now the dedicated slide mode.
      migrate: (persisted, version) => {
        const state = {
          ...(persisted as Record<string, unknown>),
        };
        if (version < 1 && state.superFocusSpace === "xl") {
          state.superFocusSpace = "s";
          state.slideMode = true;
        }
        return state as unknown as DisplayState;
      },
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
