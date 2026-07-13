import type { TextSize } from "@/stores/displayStore";

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
];

/** Subscribe to OS `prefers-color-scheme` so the Dark switch reflects the resolved value under `system`. */
function subscribeSystemTheme(callback: () => void) {
  const mql = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  mql?.addEventListener("change", callback);
  return () => mql?.removeEventListener("change", callback);
}

/**
 * Header control (top-right eye icon) opening a popover of display preferences: reading text size,
 * dark/light mode, focus mode (hides the sidebar), and content width. Backed by the persisted
 * {@link useDisplayStore} so choices survive reloads.
 */
export function DisplayOptions() {
  const theme = useDisplayStore(s => s.theme);
  const setTheme = useDisplayStore(s => s.setTheme);
  const textSize = useDisplayStore(s => s.textSize);
  const setTextSize = useDisplayStore(s => s.setTextSize);
  const focusMode = useDisplayStore(s => s.focusMode);
  const setFocusMode = useDisplayStore(s => s.setFocusMode);
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
        className="w-64 space-y-4"
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
