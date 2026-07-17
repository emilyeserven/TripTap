import type {
  Capture,
  CreatePracticeSentenceInput,
  Sentence,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Download } from "lucide-react";

import { useCapture, useCaptures } from "../hooks/useCaptures";
import { useCreatePracticeSentencesMany } from "../hooks/usePracticeSentences";
import { useSentences } from "../hooks/useSentences";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Toggle a value's membership in a Set (immutably). */
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Imports practice sentences from existing material: either the lines of an OCR capture, or bank
 * sentences. Each import keeps a provenance link back to its origin (capture or sentence) plus the
 * origin's source + page. New rows default to `needsCorrection` server-side.
 */
export function PracticeSentenceImportDialog() {
  const [open, setOpen] = useState(false);
  const importMany = useCreatePracticeSentencesMany();

  const close = () => {
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import practice sentences</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="capture">
          <TabsList>
            <TabsTrigger value="capture">From a capture</TabsTrigger>
            <TabsTrigger value="sentences">From bank sentences</TabsTrigger>
          </TabsList>
          <TabsContent value="capture">
            <CaptureImport
              pending={importMany.isPending}
              onImport={async (inputs) => {
                await importMany.mutateAsync(inputs);
                close();
              }}
            />
          </TabsContent>
          <TabsContent value="sentences">
            <SentenceImport
              pending={importMany.isPending}
              onImport={async (inputs) => {
                await importMany.mutateAsync(inputs);
                close();
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function captureLabel(text: string, title: string | null): string {
  if (title) return title;
  const preview = text.trim().replace(/\s+/g, " ").slice(0, 40);
  return preview || "Untitled capture";
}

function CaptureImport({
  pending,
  onImport,
}: {
  pending: boolean;
  onImport: (inputs: CreatePracticeSentenceInput[]) => Promise<void>;
}) {
  const {
    data: captures,
  } = useCaptures();
  const [captureId, setCaptureId] = useState<string>("");
  const {
    data: capture,
  } = useCapture(captureId);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const lines = useMemo(() => captureLines(capture), [capture]);

  const submit = async () => {
    if (!capture) return;
    const inputs: CreatePracticeSentenceInput[] = [...selected]
      .sort((a, b) => a - b)
      .map(i => ({
        text: lines[i],
        language: "Japanese",
        captureId: capture.id,
        sourceId: capture.sourceId,
        page: capture.page,
      }));
    if (inputs.length === 0) return;
    await onImport(inputs);
    setSelected(new Set());
  };

  return (
    <div className="space-y-3 pt-2">
      <Select
        value={captureId}
        onValueChange={(v) => {
          setCaptureId(v);
          setSelected(new Set());
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a capture…" />
        </SelectTrigger>
        <SelectContent>
          {(captures ?? []).map(c => (
            <SelectItem
              key={c.id}
              value={c.id}
            >
              {captureLabel(c.text, c.title)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {captureId && lines.length === 0
        ? <p className="text-sm text-muted-foreground">This capture has no text lines.</p>
        : null}

      {lines.length > 0
        ? (
          <div
            className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2"
          >
            {lines.map((line, i) => (
              <label
                key={i}
                className="
                  flex cursor-pointer items-start gap-2 rounded-sm px-1.5 py-1
                  text-sm
                  hover:bg-muted
                "
              >
                <Checkbox
                  className="mt-0.5"
                  checked={selected.has(i)}
                  onCheckedChange={() => setSelected(prev => toggle(prev, i))}
                />
                {line}
              </label>
            ))}
          </div>
        )
        : null}

      <Button
        disabled={selected.size === 0 || pending}
        onClick={() => void submit()}
      >
        {pending
          ? "Importing…"
          : `Import ${selected.size || ""} ${selected.size === 1 ? "line" : "lines"}`.trim()}
      </Button>
    </div>
  );
}

/** Split a capture's cleaned (or raw) text into trimmed, non-empty lines. */
function captureLines(capture: Capture | undefined): string[] {
  if (!capture) return [];
  return (capture.cleanedText ?? capture.text)
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
}

function SentenceImport({
  pending,
  onImport,
}: {
  pending: boolean;
  onImport: (inputs: CreatePracticeSentenceInput[]) => Promise<void>;
}) {
  const {
    data: sentences,
  } = useSentences();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = sentences ?? [];
    if (!q) return all;
    return all.filter(s =>
      s.text.toLowerCase().includes(q) || (s.translation ?? "").toLowerCase().includes(q));
  }, [sentences, search]);

  const submit = async () => {
    const byId = new Map((sentences ?? []).map(s => [s.id, s]));
    const inputs: CreatePracticeSentenceInput[] = [...selected]
      .map(id => byId.get(id))
      .filter((s): s is Sentence => s !== undefined)
      .map(s => ({
        text: s.text,
        language: s.language,
        translation: s.translation,
        sentenceId: s.id,
        sourceId: s.sourceId,
        page: s.page,
      }));
    if (inputs.length === 0) return;
    await onImport(inputs);
    setSelected(new Set());
  };

  return (
    <div className="space-y-3 pt-2">
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search sentences…"
        aria-label="Search sentences"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
        {shown.length === 0
          ? <p className="p-2 text-sm text-muted-foreground">No matching sentences.</p>
          : shown.map(s => (
            <label
              key={s.id}
              className="
                flex cursor-pointer items-start gap-2 rounded-sm px-1.5 py-1
                text-sm
                hover:bg-muted
              "
            >
              <Checkbox
                className="mt-0.5"
                checked={selected.has(s.id)}
                onCheckedChange={() => setSelected(prev => toggle(prev, s.id))}
              />
              <span>
                {s.text}
                {s.translation
                  ? <span className="block text-xs text-muted-foreground">{s.translation}</span>
                  : null}
              </span>
            </label>
          ))}
      </div>
      <Button
        disabled={selected.size === 0 || pending}
        onClick={() => void submit()}
      >
        {pending ? "Importing…" : `Import ${selected.size || ""}`.trim()}
      </Button>
    </div>
  );
}
