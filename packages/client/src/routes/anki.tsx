import { useEffect, useMemo, useRef, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";

import { matches } from "@/components/lesson/search";
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
import { usePracticeSentences } from "@/hooks/usePracticeSentences";
import { useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useVocab } from "@/hooks/useVocab";
import { furiganaReading, isAnkiSentenceEligible, toAnkiSentenceText, toAnkiVocabText } from "@/lib/anki";

export const Route = createFileRoute("/anki")({
  component: AnkiPage,
});

/** One selectable row, mode-agnostic. `secondary`/`tertiary` are the note's extra Anki columns. */
interface ExportItem {
  id: string;
  label: string;
  sublabel: string;
  secondary: string | null;
  tertiary: string | null;
  eligible: boolean;
  sourceId: string | null;
  /** Extra fields (meaning, tags, notes) folded into the search. */
  searchExtra: (string | null)[];
}

interface Source {
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

/** The picker + export-list + output for one mode; owns its own localStorage-backed id list. */
function ExportPanel({
  items,
  sources,
  storageKey,
  toText,
  pickerHint,
}: {
  items: ExportItem[];
  sources: Source[] | undefined;
  storageKey: string;
  toText: (selected: ExportItem[]) => string;
  pickerHint: string;
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
          <CardDescription>
            Saved in this browser; paste the output into Anki via File → Import (fields separated by Tab).
          </CardDescription>
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
            aria-label="Anki export text"
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

function AnkiPage() {
  const {
    data: sentences,
  } = useSentences();
  const {
    data: vocab,
  } = useVocab();
  const {
    data: practiceSentences,
  } = usePracticeSentences();
  const {
    data: sources,
  } = useSources();

  const [mode, setMode] = useState<"sentences" | "vocab" | "practice">("sentences");

  const sentenceItems: ExportItem[] = useMemo(() => (sentences ?? []).map(s => ({
    id: s.id,
    label: s.text,
    sublabel: s.translation ?? "",
    secondary: s.translation,
    tertiary: furiganaReading(s.reading),
    eligible: isAnkiSentenceEligible(s),
    sourceId: s.sourceId,
    searchExtra: [s.tags, s.notes],
  })), [sentences]);

  const vocabItems: ExportItem[] = useMemo(() => (vocab ?? []).map(v => ({
    id: v.id,
    label: v.term,
    sublabel: [v.reading, v.meaning].filter(Boolean).join(" · "),
    secondary: v.reading,
    tertiary: v.meaning,
    eligible: Boolean(v.term.trim()),
    sourceId: v.sourceId,
    searchExtra: [v.meaning, v.tags, v.notes],
  })), [vocab]);

  const practiceItems: ExportItem[] = useMemo(() => (practiceSentences ?? []).map(p => ({
    id: p.id,
    label: p.text,
    sublabel: p.translation ?? "",
    secondary: p.translation,
    // Practice `reading` is already a plain string (not FuriToken[]), so no conversion is needed.
    tertiary: p.reading,
    eligible: isAnkiSentenceEligible(p),
    sourceId: p.sourceId,
    searchExtra: [p.target, p.nuance],
  })), [practiceSentences]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Anki export</h1>
        <p className="text-sm text-muted-foreground">
          Build a list and copy tab-separated notes to import into Anki — sentences as
          {" "}
          <code>expression⇥meaning⇥reading</code>
          , words as
          {" "}
          <code>term⇥reading⇥meaning</code>
          .
        </p>
      </div>

      <div className="flex gap-2">
        {([
          {
            m: "sentences",
            label: "Sentences",
          },
          {
            m: "vocab",
            label: "Vocab",
          },
          {
            m: "practice",
            label: "Practice",
          },
        ] as const).map(({
          m, label,
        }) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === "sentences"
        ? (
          <ExportPanel
            items={sentenceItems}
            sources={sources}
            storageKey="anki-export"
            pickerHint="Only sentences with a translation can be exported."
            toText={selected =>
              toAnkiSentenceText(selected.map(i => ({
                text: i.label,
                translation: i.secondary,
                reading: i.tertiary,
              })))}
          />
        )
        : null}
      {mode === "vocab"
        ? (
          <ExportPanel
            items={vocabItems}
            sources={sources}
            storageKey="anki-export-vocab"
            pickerHint="Exported one per line as term, reading, meaning."
            toText={selected =>
              toAnkiVocabText(selected.map(i => ({
                term: i.label,
                reading: i.secondary,
                meaning: i.tertiary,
              })))}
          />
        )
        : null}
      {mode === "practice"
        ? (
          <ExportPanel
            items={practiceItems}
            sources={sources}
            storageKey="anki-export-practice"
            pickerHint="Practice sentences with a translation. Use Anki's reversed note type for E→J cards."
            toText={selected =>
              toAnkiSentenceText(selected.map(i => ({
                text: i.label,
                translation: i.secondary,
                reading: i.tertiary,
              })))}
          />
        )
        : null}
    </section>
  );
}
