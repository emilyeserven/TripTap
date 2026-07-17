import { useEffect, useMemo, useRef, useState } from "react";

import { Plus, X } from "lucide-react";

import { matches } from "@/components/ai-lesson/search";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * One selectable row, mode-agnostic. `secondary`/`tertiary` are the export's extra columns
 * (translation/reading/meaning depending on the mode); `tertiary` is unused by exports that only
 * need two fields.
 */
export interface ExportItem {
  id: string;
  label: string;
  sublabel: string;
  secondary: string | null;
  tertiary?: string | null;
  eligible: boolean;
  sourceId: string | null;
  /** Extra fields (meaning, tags, notes) folded into the search. */
  searchExtra: (string | null)[];
}

export interface ExportSource {
  id: string;
  name: string;
}

function loadIds(key: string): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  }
  catch {
    return [];
  }
}

/**
 * The picker + export-list + output for one export mode (Anki/Renshuu); owns its own
 * localStorage-backed id list.
 */
export function ExportPanel({
  items,
  sources,
  storageKey,
  toText,
  pickerHint,
  outputHint,
  outputLabel,
}: {
  items: ExportItem[];
  sources: ExportSource[] | undefined;
  storageKey: string;
  toText: (selected: ExportItem[]) => string;
  pickerHint: string;
  /** The export-list card's description, e.g. how to paste the output into the target app. */
  outputHint: string;
  /** Accessible label for the output textarea, e.g. "Anki export text". */
  outputLabel: string;
}) {
  const [ids, setIds] = useState<string[]>(() => loadIds(storageKey));
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify(ids));
    }
    catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [ids, storageKey]);

  const byId = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const inList = new Set(ids);
  const listed = ids.map(id => byId.get(id)).filter((i): i is ExportItem => Boolean(i));
  const output = toText(listed);

  const sourceOptions = useMemo(() => [
    {
      value: "all",
      label: "All sources",
    },
    ...(sources ?? []).map(s => ({
      value: s.id,
      label: s.name,
    })),
  ], [sources]);

  const candidates = items.filter(i =>
    !inList.has(i.id)
    && (sourceFilter === "all" || i.sourceId === sourceFilter)
    && matches(search, i.label, i.sublabel, ...i.searchExtra));
  const addableIds = candidates.filter(i => i.eligible).map(i => i.id);

  function add(id: string) {
    setIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setCopied(false);
  }
  function addAll() {
    setIds(prev => [...prev, ...addableIds.filter(id => !prev.includes(id))]);
    setCopied(false);
  }
  function removeId(id: string) {
    setIds(prev => prev.filter(x => x !== id));
    setCopied(false);
  }
  function removeAll() {
    setIds([]);
    setCopied(false);
  }

  async function copy() {
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(output);
        setCopied(true);
        return;
      }
    }
    catch {
      // fall through to the execCommand path below (needed on plain HTTP)
    }
    const el = outputRef.current;
    if (el) {
      el.focus();
      el.select();
      try {
        globalThis.document.execCommand("copy");
        setCopied(true);
      }
      catch {
        setCopied(false);
      }
    }
  }

  return (
    <div
      className="
        grid items-start gap-6
        lg:grid-cols-2
      "
    >
      {/* Picker */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle>Add</CardTitle>
              <CardDescription>{pickerHint}</CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addAll}
              disabled={addableIds.length === 0}
              title="Add all matching"
            >
              Add all (
              {addableIds.length}
              )
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              aria-label="Search"
              className="flex-1"
            />
            {sources && sources.length > 0
              ? (
                <Combobox
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={sourceOptions}
                  ariaLabel="Filter by source"
                  searchPlaceholder="Search sources…"
                  className="w-44"
                />
              )
              : null}
          </div>
          <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
            {candidates.length === 0
              ? <p className="text-sm text-muted-foreground">Nothing to add.</p>
              : candidates.map(i => (
                <div
                  key={i.id}
                  className="
                    flex items-center gap-2 rounded-md border border-input p-2
                    text-sm
                  "
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{i.label}</div>
                    <div className="truncate text-muted-foreground">
                      {i.sublabel || "— no translation —"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!i.eligible}
                    title={i.eligible ? "Add" : "Needs a translation"}
                    onClick={() => add(i.id)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Export list + output */}
      <Card>
        <CardHeader>
          <CardTitle>
            Export list —
            {" "}
            {listed.length}
          </CardTitle>
          <CardDescription>{outputHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-[40vh] space-y-1.5 overflow-y-auto">
            {listed.length === 0
              ? <p className="text-sm text-muted-foreground">Nothing added yet.</p>
              : listed.map(i => (
                <div
                  key={i.id}
                  className="
                    flex items-center gap-2 rounded-md border border-input p-2
                    text-sm
                  "
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{i.label}</div>
                    <div className="truncate text-muted-foreground">{i.sublabel}</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title="Remove"
                    onClick={() => removeId(i.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
          </div>

          <Textarea
            ref={outputRef}
            readOnly
            value={output}
            rows={8}
            className="font-mono text-xs"
            aria-label={outputLabel}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void copy()}
              disabled={output.length === 0}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={removeAll}
              disabled={ids.length === 0}
            >
              Remove all
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
