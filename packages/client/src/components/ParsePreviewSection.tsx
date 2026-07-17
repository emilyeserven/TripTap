import type { ParseResult } from "@/lib/parseTemplate";
import type { ParseTarget } from "@sentence-bank/types";

import { REQUIRED, TAGS } from "@/lib/captureParseUi";

/**
 * Preview list for one parsed section of the capture parse workspace. `target` drives which fields
 * and validity label to show. Sentence sections additionally render the auto-suggested vocab links
 * as removable chips when the link callbacks are provided.
 */
export function ParsePreviewSection({
  target,
  result,
  linksFor,
  onRemoveLink,
  vocabName,
}: {
  target: ParseTarget;
  result: ParseResult;
  /** Linked vocab ids for the item at `index` (sentence sections only). */
  linksFor?: (index: number, text: string) => string[];
  onRemoveLink?: (index: number, text: string, id: string) => void;
  /** Resolve a linked vocab id to its display term. */
  vocabName?: (id: string) => string;
}) {
  return (
    <div className="space-y-2">
      {result.items.length === 0
        ? <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
        : result.items.map((item, i) => (
          <div
            key={i}
            className={`
              rounded-md border p-2 text-sm
              ${
          item.valid
            ? "border-input"
            : "border-dashed border-input opacity-50"
          }
            `}
          >
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {TAGS[target]
                .filter(f => item.fields[f])
                .map(f => (
                  <span key={f}>
                    <span className="text-xs text-muted-foreground">
                      {f}
                      :
                    </span>
                    {" "}
                    {item.fields[f]}
                  </span>
                ))}
              {!item.valid ? <span className="text-xs text-destructive">missing {REQUIRED[target]}</span> : null}
            </div>
            {target === "sentence" && item.valid && linksFor && linksFor(i, item.fields.text).length > 0
              ? (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-xs text-muted-foreground">vocab:</span>
                  {linksFor(i, item.fields.text).map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onRemoveLink?.(i, item.fields.text, id)}
                      className="
                        rounded-full bg-blue-50 px-2 py-0.5 text-xs
                        text-blue-700
                        hover:line-through
                      "
                      title="Remove link"
                    >
                      {vocabName?.(id) ?? id}
                      {" ×"}
                    </button>
                  ))}
                </div>
              )
              : null}
          </div>
        ))}
    </div>
  );
}
