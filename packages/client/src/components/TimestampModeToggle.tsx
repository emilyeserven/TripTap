import { Switch } from "@/components/ui/switch";
import { useUiStore } from "@/stores/uiStore";

/**
 * Toggle for how note timestamps are captured: on at typing-start, off at submit. Backed by the global
 * {@link useUiStore} pref so the choice persists across sessions (mirrors the reference note-taker app).
 */
export function TimestampModeToggle() {
  const timestampMode = useUiStore(s => s.timestampMode);
  const setTimestampMode = useUiStore(s => s.setTimestampMode);
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Switch
        checked={timestampMode === "typing-start"}
        onCheckedChange={checked => setTimestampMode(checked ? "typing-start" : "submit")}
        aria-label="Timestamp on typing start"
      />
      Timestamp on typing start
    </label>
  );
}
