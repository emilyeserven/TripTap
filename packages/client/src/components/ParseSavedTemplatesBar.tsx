import type { ParseTemplate } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import { FIELD_CLASS } from "@/lib/captureParseUi";

/**
 * The saved-templates controls of the capture parse workspace: load a saved template for the
 * current target, save the current one, or delete the loaded one. Single-target modes only.
 */
export function ParseSavedTemplatesBar({
  templates,
  savedId,
  savePending,
  onLoad,
  onSave,
  onDelete,
}: {
  templates: ParseTemplate[];
  /** The loaded template's id, or "" when none is loaded. */
  savedId: string;
  savePending: boolean;
  onLoad: (id: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={`
          ${FIELD_CLASS}
          mt-0 max-w-52
        `}
        value={savedId}
        onChange={e => onLoad(e.target.value)}
        aria-label="Load saved template"
      >
        <option value="">Saved templates…</option>
        {templates.map(t => (
          <option
            key={t.id}
            value={t.id}
          >
            {t.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onSave}
        disabled={savePending}
      >
        Save template
      </Button>
      {savedId
        ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onDelete(savedId)}
          >
            Delete
          </Button>
        )
        : null}
    </div>
  );
}
