import type { CleanedGroupKind, CleanedLine, CleanedLineRole } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import { hasScriptBoundary } from "@/lib/cleanedBlocks";
import { INLINE_FIELD_CLASS, ROLES } from "@/lib/cleanedBlocksUi";

/**
 * One editable line of the cleaned-blocks editor: selection checkbox, the item controls when this
 * line opens its item (kind, move, unlink), the text/language/role inputs, and the split/delete
 * actions. All state lives in the parent workspace.
 */
export function CleanedLineRow({
  line,
  checked,
  dimmed,
  tintClass,
  opensItem,
  isLinked,
  kind,
  canMoveUp,
  canMoveDown,
  langOptions,
  caretIndex,
  onToggleSelect,
  onKindChange,
  onMoveUp,
  onMoveDown,
  onUnlinkItem,
  onTextChange,
  onCaretChange,
  onLangChange,
  onRoleChange,
  onSplitByScript,
  onSplitAtCaret,
  onRemove,
}: {
  line: CleanedLine;
  checked: boolean;
  dimmed: boolean;
  tintClass: string;
  /** True when this is the first line of its item, which carries the item-level controls. */
  opensItem: boolean;
  isLinked: boolean;
  kind: CleanedGroupKind;
  canMoveUp: boolean;
  canMoveDown: boolean;
  langOptions: string[];
  /** Caret position within this line's text input, or null when the caret is elsewhere. */
  caretIndex: number | null;
  onToggleSelect: (shiftKey: boolean) => void;
  onKindChange: (kind: CleanedGroupKind) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUnlinkItem: () => void;
  onTextChange: (text: string) => void;
  onCaretChange: (index: number) => void;
  onLangChange: (lang: string) => void;
  onRoleChange: (role: CleanedLineRole) => void;
  onSplitByScript: () => void;
  onSplitAtCaret: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`
        flex flex-wrap items-center gap-1.5 rounded-md border border-l-4
        border-input bg-card p-1.5
        ${tintClass}
        ${checked ? "ring-2 ring-blue-400" : ""}
        ${dimmed ? "opacity-50" : ""}
      `}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0"
        checked={checked}
        onChange={e => onToggleSelect((e.nativeEvent as MouseEvent).shiftKey)}
        aria-label="Select line"
      />

      {opensItem
        ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <select
              className={INLINE_FIELD_CLASS}
              value={kind}
              onChange={e => onKindChange(e.target.value as CleanedGroupKind)}
              aria-label="Item kind"
              title="What this item produces"
            >
              <option value="sentence">Sentence</option>
              <option value="vocab">Vocab</option>
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              title="Move item up"
            >
              ↑
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              title="Move item down"
            >
              ↓
            </Button>
            {isLinked
              ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onUnlinkItem}
                  title="Unlink this item"
                >
                  🔗✕
                </Button>
              )
              : null}
          </div>
        )
        : (
          <span
            className={`
              shrink-0
              ${isLinked
            ? "w-7 text-center text-xs text-blue-500"
            : "w-28"}
            `}
            aria-hidden
          >
            {isLinked ? "🔗" : null}
          </span>
        )}

      <input
        className={`
          ${INLINE_FIELD_CLASS}
          min-w-40 flex-1
        `}
        value={line.text}
        onChange={e => onTextChange(e.target.value)}
        onSelect={e => onCaretChange(e.currentTarget.selectionStart ?? 0)}
        aria-label="Line text"
      />

      <select
        className={INLINE_FIELD_CLASS}
        value={line.lang}
        onChange={e => onLangChange(e.target.value)}
        aria-label="Line language"
      >
        {langOptions.map(code => (
          <option
            key={code}
            value={code}
          >
            {code}
          </option>
        ))}
      </select>

      <select
        className={INLINE_FIELD_CLASS}
        value={line.role}
        onChange={e => onRoleChange(e.target.value as CleanedLineRole)}
        aria-label="Line role"
      >
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
        variant="ghost"
        onClick={onSplitByScript}
        disabled={!hasScriptBoundary(line.text)}
        title="Split into separate lines by language/script"
      >
        あ/A
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onSplitAtCaret}
        disabled={caretIndex === null || caretIndex <= 0 || caretIndex >= line.text.length}
        title="Split this line into two at the cursor"
      >
        ✂
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRemove}
        title="Delete line"
      >
        ✕
      </Button>
    </div>
  );
}
