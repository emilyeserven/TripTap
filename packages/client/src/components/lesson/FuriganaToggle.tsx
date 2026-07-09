import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUiStore } from "@/stores/uiStore";

/** App-wide furigana on/off switch, backed by the UI store. */
export function FuriganaToggle() {
  const furigana = useUiStore(s => s.furigana);
  const toggle = useUiStore(s => s.toggleFurigana);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Switch
        id="furigana"
        checked={furigana}
        onCheckedChange={toggle}
      />
      <Label
        htmlFor="furigana"
        className="text-xs"
      >ふりがな
      </Label>
    </div>
  );
}
