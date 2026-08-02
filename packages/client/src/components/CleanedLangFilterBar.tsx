import { LANG_NAMES } from "@/lib/cleanedBlocks";

/**
 * The "Ignore language" chip bar of the cleaned-blocks editor: one toggle per language present in
 * the capture; ignored languages render struck-through and their lines are excluded from items.
 */
export function CleanedLangFilterBar({
  presentLangs,
  ignoredLangs,
  onToggle,
}: {
  presentLangs: string[];
  ignoredLangs: Set<string>;
  onToggle: (code: string) => void;
}) {
  if (presentLangs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-foreground">Ignore language:</span>
      {presentLangs.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => onToggle(code)}
          className={`
            rounded-full border px-2 py-0.5 text-xs
            ${
        ignoredLangs.has(code)
          ? "border-destructive bg-destructive/10 text-destructive line-through"
          : `
            border-input text-muted-foreground
            hover:border-ring
          `
        }
          `}
          title={ignoredLangs.has(code) ? "Include again" : "Exclude these lines"}
        >
          {code}
          {" "}
          (
          {LANG_NAMES[code] ?? "?"}
          )
        </button>
      ))}
    </div>
  );
}
