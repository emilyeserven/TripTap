import type { Sentence } from "@sentence-bank/types";

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
import { useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { isRenshuuEligible, toRenshuuText } from "@/lib/renshuu";

export const Route = createFileRoute("/renshuu")({
  component: RenshuuPage,
});

const STORAGE_KEY = "renshuu-export";

/** Load the saved id list from localStorage (best-effort). */
function loadIds(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  }
  catch {
    return [];
  }
}

function RenshuuPage() {
  const {
    data: sentences,
  } = useSentences();
  const {
    data: sources,
  } = useSources();

  const [ids, setIds] = useState<string[]>(() => loadIds());
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  // Persist the export list.
  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
    catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [ids]);

  const byId = useMemo(() => {
    const map = new Map<string, Sentence>();
    for (const s of sentences ?? []) map.set(s.id, s);
    return map;
  }, [sentences]);

  const inList = new Set(ids);
  const listed = ids.map(id => byId.get(id)).filter((s): s is Sentence => Boolean(s));
  const output = toRenshuuText(listed);

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

  const candidates = (sentences ?? []).filter(s =>
    !inList.has(s.id)
    && (sourceFilter === "all" || s.sourceId === sourceFilter)
    && matches(search, s.text, s.translation, s.tags, s.notes));
  // Only exportable rows can be bulk-added (they need a translation).
  const addableIds = candidates.filter(isRenshuuEligible).map(s => s.id);

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
  function clear() {
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
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Renshuu export</h1>
        <p className="text-sm text-muted-foreground">
          Build a list of sentences and copy it as
          {" "}
          <code>{"<japanese>⇥<english>"}</code>
          {" "}
          lines to paste into a Renshuu sentence lesson.
        </p>
      </div>

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
                <CardTitle>Add sentences</CardTitle>
                <CardDescription>
                  Only sentences with a translation can be exported.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addAll}
                disabled={addableIds.length === 0}
                title="Add all matching sentences"
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
                placeholder="Search sentences…"
                aria-label="Search sentences"
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
                ? <p className="text-sm text-muted-foreground">No sentences to add.</p>
                : candidates.map((s) => {
                  const eligible = isRenshuuEligible(s);
                  return (
                    <div
                      key={s.id}
                      className="
                        flex items-center gap-2 rounded-md border border-input
                        p-2 text-sm
                      "
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{s.text}</div>
                        <div className="truncate text-muted-foreground">
                          {s.translation ?? "— no translation —"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!eligible}
                        title={eligible ? "Add to list" : "Needs a translation"}
                        onClick={() => add(s.id)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  );
                })}
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
            <CardDescription>Saved in this browser; paste the output into Renshuu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[40vh] space-y-1.5 overflow-y-auto">
              {listed.length === 0
                ? <p className="text-sm text-muted-foreground">Nothing added yet.</p>
                : listed.map(s => (
                  <div
                    key={s.id}
                    className="
                      flex items-center gap-2 rounded-md border border-input p-2
                      text-sm
                    "
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.text}</div>
                      <div className="truncate text-muted-foreground">{s.translation}</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Remove"
                      onClick={() => removeId(s.id)}
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
              aria-label="Renshuu export text"
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
                onClick={clear}
                disabled={ids.length === 0}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
