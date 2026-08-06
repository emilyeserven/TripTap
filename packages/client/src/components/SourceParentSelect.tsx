import { flattenSourceTree, wouldCreateSourceCycle } from "@sentence-bank/types";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSources } from "@/hooks/useSources";
import { sourceMenuIndent } from "@/lib/source-options";

// Radix Select forbids empty-string item values, so map "no parent" to a sentinel.
const NONE = "__none";

/**
 * Picks the source a source sits inside — the magazine an issue belongs to, the issue a page belongs
 * to. "Top level" means no parent.
 *
 * When editing, pass `selfId`: that source and everything beneath it are left out, since nesting a
 * magazine under its own page is the one arrangement the API rejects.
 */
export function SourceParentSelect({
  value,
  onChange,
  selfId,
  id = "source-parent",
  label = "Part of",
}: {
  value: string | null;
  onChange: (parentId: string | null) => void;
  selfId?: string;
  id?: string;
  label?: string;
}) {
  const {
    data: sources,
  } = useSources();
  const all = sources ?? [];
  const choices = flattenSourceTree(all).filter(({
    source,
  }) => !selfId || (source.id !== selfId && !wouldCreateSourceCycle(all, selfId, source.id)));

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={next => onChange(next === NONE ? null : next)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Top level</SelectItem>
          {choices.map(({
            source, depth,
          }) => (
            <SelectItem
              key={source.id}
              value={source.id}
            >
              {`${sourceMenuIndent(depth)}${source.name}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
