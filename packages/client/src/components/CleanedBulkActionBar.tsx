import type { CleanedGroupKind, CleanedLineRole } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import { INLINE_FIELD_CLASS, ROLES } from "@/lib/cleanedBlocksUi";

/**
 * The sticky bulk-action bar of the cleaned-blocks editor. Always occupies its space; visibility
 * toggles with the selection so rows never shift.
 */
export function CleanedBulkActionBar({
  selectedCount,
  onStitch,
  onUnstitch,
  onLink,
  onUnlink,
  onSetRole,
  onSetKind,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  onStitch: () => void;
  onUnstitch: () => void;
  onLink: () => void;
  onUnlink: () => void;
  onSetRole: (role: CleanedLineRole) => void;
  onSetKind: (kind: CleanedGroupKind) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className={`
        sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-md border
        border-blue-300 bg-blue-50 p-2 text-sm
        ${selectedCount > 0 ? "visible" : "invisible"}
      `}
      aria-hidden={selectedCount === 0}
    >
      <span className="font-medium text-blue-900">
        {selectedCount}
        {" "}
        selected
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onStitch}
        title="Stitch continuation lines into one text"
      >
        Stitch
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onUnstitch}
        title="Split each selected line into its own stitch"
      >
        Unstitch
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onLink}
        title="Link a text block to its translation (they derive as one item)"
      >
        Link
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onUnlink}
        title="Unlink the selected items"
      >
        Unlink
      </Button>
      <select
        className={INLINE_FIELD_CLASS}
        value=""
        onChange={(e) => {
          if (e.target.value) onSetRole(e.target.value as CleanedLineRole);
        }}
        aria-label="Set role for selected lines"
      >
        <option value="">Set role…</option>
        {ROLES.map(r => (
          <option
            key={r.value}
            value={r.value}
          >
            {r.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onSetKind("vocab")}
        title="Make the selected items vocab"
      >
        → Vocab
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onSetKind("sentence")}
        title="Make the selected items sentences"
      >
        → Sentence
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onDelete}
      >
        Delete
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onClear}
      >
        Clear
      </Button>
    </div>
  );
}
