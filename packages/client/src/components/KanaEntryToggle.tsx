import type { KanaScript } from "@/stores/uiStore";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUiStore } from "@/stores/uiStore";

const SCRIPTS: { value: KanaScript;
  label: string; }[] = [
  {
    value: "hiragana",
    label: "あ",
  },
  {
    value: "katakana",
    label: "ア",
  },
];

/**
 * Toggle for kana-only note entry: when on, the note field converts typed romaji to kana (never kanji)
 * and a separate untranslated English-context field appears. The nested hiragana/katakana selector picks
 * the output script. Backed by the global {@link useUiStore} pref so the choice persists across sessions.
 */
export function KanaEntryToggle() {
  const kanaEntry = useUiStore(s => s.kanaEntry);
  const setKanaEntry = useUiStore(s => s.setKanaEntry);
  const kanaScript = useUiStore(s => s.kanaScript);
  const setKanaScript = useUiStore(s => s.setKanaScript);
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <label className="flex items-center gap-2">
        <Switch
          checked={kanaEntry}
          onCheckedChange={setKanaEntry}
          aria-label="Kana-only entry"
        />
        Kana-only entry
      </label>
      {kanaEntry && (
        <div
          className="flex overflow-hidden rounded-md border"
          role="group"
          aria-label="Kana script"
        >
          {SCRIPTS.map(({
            value, label,
          }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={kanaScript === value ? "default" : "ghost"}
              className="rounded-none"
              aria-pressed={kanaScript === value}
              onClick={() => setKanaScript(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
