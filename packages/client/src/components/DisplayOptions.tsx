import type { SlideProgress, SuperFocusSpace, TextSize } from "@/stores/displayStore";

import { useSyncExternalStore } from "react";

import { EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { resolveTheme, useDisplayStore } from "@/stores/displayStore";

const TEXT_SIZES: { value: TextSize;
  label: string; }[] = [
  {
    value: "regular",
    label: "Regular",
  },
  {
    value: "large",
    label: "Large",
  },
  {
    value: "xl",
    label: "XL",
  },
  {
    value: "xxl",
    label: "XXL",
  },
];

const SPACE_OPTIONS: { value: SuperFocusSpace;
  label: string; }[] = [
  {
    value: "s",
    label: "S",
  },
  {
    value: "m",
    label: "M",
  },
  {
    value: "l",
    label: "L",
  },
];

const PROGRESS_OPTIONS: { value: SlideProgress;
  label: string; }[] = [
  {
    value: "none",
    label: "None",
  },
  {
    value: "line",
    label: "Line",
  },
  {
    value: "boxes",
    label: "Boxes",
  },
];

/** Subscribe to OS `prefers-color-scheme` so the Dark switch reflects the resolved value under `system`. */
function subscribeSystemTheme(callback: () => void) {
  const mql = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  mql?.addEventListener("change", callback);
  return () => mql?.removeEventListener("change", callback);
}

/**
 * Header control (top-right eye icon) opening a popover of display preferences: reading text size,
 * dark/light mode, focus mode (hides the sidebar), super focus mode (also stacks form fields full
 * width), and content width. Backed by the persisted {@link useDisplayStore} so choices survive reloads.
 */
export function DisplayOptions() {
  const theme = useDisplayStore(s => s.theme);
  const setTheme = useDisplayStore(s => s.setTheme);
  const textSize = useDisplayStore(s => s.textSize);
  const setTextSize = useDisplayStore(s => s.setTextSize);
  const focusMode = useDisplayStore(s => s.focusMode);
  const setFocusMode = useDisplayStore(s => s.setFocusMode);
  const superFocus = useDisplayStore(s => s.superFocus);
  const setSuperFocus = useDisplayStore(s => s.setSuperFocus);
  const superFocusSpace = useDisplayStore(s => s.superFocusSpace);
  const setSuperFocusSpace = useDisplayStore(s => s.setSuperFocusSpace);
  const slideMode = useDisplayStore(s => s.slideMode);
  const setSlideMode = useDisplayStore(s => s.setSlideMode);
  const slideProgress = useDisplayStore(s => s.slideProgress);
  const setSlideProgress = useDisplayStore(s => s.setSlideProgress);
  const containerWidth = useDisplayStore(s => s.containerWidth);
  const setContainerWidth = useDisplayStore(s => s.setContainerWidth);

  // Re-render on OS theme changes so the Dark switch stays accurate while theme === "system".
  const isDark = useSyncExternalStore(
    subscribeSystemTheme,
    () => resolveTheme(theme) === "dark",
    () => theme === "dark",
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Display options"
        >
          <EyeIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 space-y-4"
      >
        <div className="space-y-2">
          <span className="text-sm font-medium">Text size</span>
          <div
            className="flex overflow-hidden rounded-md border"
            role="group"
            aria-label="Text size"
          >
            {TEXT_SIZES.map(({
              value, label,
            }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={textSize === value ? "default" : "ghost"}
                className="flex-1 rounded-none"
                aria-pressed={textSize === value}
                onClick={() => setTextSize(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-2 text-sm">
          Dark mode
          <Switch
            checked={isDark}
            onCheckedChange={checked => setTheme(checked ? "dark" : "light")}
            aria-label="Dark mode"
          />
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          Focus mode
          <Switch
            checked={focusMode}
            onCheckedChange={setFocusMode}
            aria-label="Focus mode"
          />
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          Super focus mode
          <Switch
            checked={superFocus}
            onCheckedChange={setSuperFocus}
            aria-label="Super focus mode"
          />
        </label>

        {superFocus && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Field spacing</span>
            <div
              className="flex overflow-hidden rounded-md border"
              role="group"
              aria-label="Field spacing"
            >
              {SPACE_OPTIONS.map(({
                value, label,
              }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={superFocusSpace === value ? "default" : "ghost"}
                  className="flex-1 rounded-none"
                  aria-pressed={superFocusSpace === value}
                  onClick={() => setSuperFocusSpace(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center justify-between gap-2 text-sm">
          Slide mode
          <Switch
            checked={slideMode}
            onCheckedChange={setSlideMode}
            aria-label="Slide mode"
          />
        </label>

        {slideMode && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Progress bar</span>
            <div
              className="flex overflow-hidden rounded-md border"
              role="group"
              aria-label="Progress bar"
            >
              {PROGRESS_OPTIONS.map(({
                value, label,
              }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={slideProgress === value ? "default" : "ghost"}
                  className="flex-1 rounded-none"
                  aria-pressed={slideProgress === value}
                  onClick={() => setSlideProgress(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center justify-between gap-2 text-sm">
          Wide content
          <Switch
            checked={containerWidth === "wide"}
            onCheckedChange={checked => setContainerWidth(checked ? "wide" : "normal")}
            aria-label="Wide content"
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}
