import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUiStore } from "@/stores/uiStore";

/**
 * App-wide reading-level switch for dual-level lessons: off = simplified N4 (やさしい), on = native
 * (くわしい). Backed by the UI store; only rendered on lessons that carry a simplified layer.
 */
export function ReadingLevelToggle() {
  const readingLevel = useUiStore(s => s.readingLevel);
  const toggle = useUiStore(s => s.toggleReadingLevel);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Switch
        id="reading-level"
        checked={readingLevel === "full"}
        onCheckedChange={toggle}
      />
      <Label
        htmlFor="reading-level"
        className="text-xs"
      >
        {readingLevel === "easy" ? "やさしい N4" : "くわしい N2+"}
      </Label>
    </div>
  );
}
