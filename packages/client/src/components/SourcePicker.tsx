import { useState } from "react";

import { flattenSourceTree } from "@sentence-bank/types";

import { useCreateSource, useSources } from "../hooks/useSources";

import { SourceParentSelect } from "@/components/SourceParentSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sourceMenuIndent } from "@/lib/source-options";

// Radix Select forbids empty-string item values, so map "no source" to a sentinel.
const NONE = "__none";
const NEW = "__new";

/**
 * Chooses the taxonomy source a sentence or capture belongs to. Users either pick an existing source
 * or switch to a small inline form to create one; on create it is selected immediately. `value` is
 * the selected `source_id` (or null for "no source"). Built from the shared UI kit so it matches the
 * surrounding form fields and adapts to light/dark themes.
 *
 * Sources nest, so the menu shows the whole tree indented, and the inline form starts out nesting the
 * new source under whatever is currently selected — scanning three pages of one magazine issue means
 * creating three children of that issue, and this makes that the path of least resistance.
 */
export function SourcePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (sourceId: string | null) => void;
}) {
  const {
    data: sources,
  } = useSources();
  const createSource = useCreateSource();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  function startCreating() {
    setParentId(value);
    setCreating(true);
  }

  async function saveNew() {
    if (!name.trim()) return;
    const created = await createSource.mutateAsync({
      name: name.trim(),
      type: type.trim() || null,
      author: author.trim() || null,
      url: url.trim() || null,
      parentId,
    });
    onChange(created.id);
    setName("");
    setType("");
    setAuthor("");
    setUrl("");
    setParentId(null);
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">New source</p>
        <Input
          placeholder="Name (e.g. よつばと！ vol. 1)"
          aria-label="Source name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div
          className="
            grid gap-2
            sm:grid-cols-2
          "
        >
          <Input
            placeholder="Type (book, show, …)"
            aria-label="Source type"
            value={type}
            onChange={e => setType(e.target.value)}
          />
          <Input
            placeholder="Author"
            aria-label="Source author"
            value={author}
            onChange={e => setAuthor(e.target.value)}
          />
        </div>
        <Input
          placeholder="URL (e.g. https://app.renshuu.org/text/70231/0)"
          aria-label="Source URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <SourceParentSelect
          id="new-source-parent"
          value={parentId}
          onChange={setParentId}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || createSource.isPending}
            onClick={() => void saveNew()}
          >
            {createSource.isPending ? "Saving…" : "Save source"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCreating(false)}
          >
            Cancel
          </Button>
        </div>
        {createSource.isError
          ? <p className="text-xs text-destructive">{createSource.error?.message}</p>
          : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="source-picker">Source</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(next) => {
          if (next === NEW) {
            startCreating();
            return;
          }
          onChange(next === NONE ? null : next);
        }}
      >
        <SelectTrigger
          id="source-picker"
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No source</SelectItem>
          {flattenSourceTree(sources ?? []).map(({
            source, depth,
          }) => (
            <SelectItem
              key={source.id}
              value={source.id}
            >
              {`${sourceMenuIndent(depth)}${source.name}`}
            </SelectItem>
          ))}
          <SelectItem value={NEW}>+ New source…</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
