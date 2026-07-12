import type { CreateMySentenceInput } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Upload } from "lucide-react";

import { useCreateMySentencesMany } from "../hooks/useMySentences";
import { parseTemplate } from "../lib/parseTemplate";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Default per-sentence field order: one field per line, blocks separated by a blank line. */
const DEFAULT_TEMPLATE = [
  "{{text}}",
  "{{correction}}",
  "{{translation}}",
  "{{actualMeaning}}",
  "{{explanation}}",
].join("\n");

/** Human labels for the fields, shown as a legend so the user knows the line order. */
const FIELD_LABELS: Record<string, string> = {
  text: "Original sentence",
  correction: "Correction",
  translation: "Intended meaning",
  actualMeaning: "What it actually says",
  explanation: "Explanation / notes",
};

/**
 * Bulk-add My Sentences by pasting content and declaring the per-field line order. Blocks are
 * separated by a blank line; each line maps to a `{{field}}` in the editable template. A live preview
 * shows exactly what will be created before confirming.
 */
export function MySentenceBulkDialog() {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [language, setLanguage] = useState("Japanese");
  const importMany = useCreateMySentencesMany();

  const parsed = useMemo(
    () =>
      parseTemplate(paste, template, {
        boundary: "blank",
        ignoreBlankLines: true,
        requiredField: "text",
      }),
    [paste, template],
  );

  const templateFields = useMemo(() => {
    const found = [...template.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    return [...new Set(found)];
  }, [template]);

  const reset = () => {
    setPaste("");
    setTemplate(DEFAULT_TEMPLATE);
  };

  const submit = async () => {
    const inputs: CreateMySentenceInput[] = parsed.items
      .filter(item => item.valid)
      .map((item) => {
        const f = item.fields;
        const correction = (f.correction ?? "").trim();
        return {
          text: f.text.trim(),
          language: language.trim() || "Japanese",
          translation: f.translation?.trim() || null,
          correction: correction || null,
          needsCorrection: correction.length === 0,
          actualMeaning: f.actualMeaning?.trim() || null,
          explanation: f.explanation?.trim() || null,
        };
      });
    if (inputs.length === 0) return;
    await importMany.mutateAsync(inputs);
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="size-4" />
          Bulk add
        </Button>
      </DialogTrigger>
      <DialogContent
        className="
          max-h-[85vh] overflow-y-auto
          sm:max-w-3xl
        "
      >
        <DialogHeader>
          <DialogTitle>Bulk add sentences</DialogTitle>
          <DialogDescription>
            Paste your sentences below, separating each one with a blank line. Each line within a block
            maps to a field, in the order set by the template.
          </DialogDescription>
        </DialogHeader>

        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          <div className="space-y-1.5">
            <Label htmlFor="bulk-paste">Pasted content</Label>
            <Textarea
              id="bulk-paste"
              value={paste}
              onChange={e => setPaste(e.target.value)}
              placeholder={"猫は魚が好きだ\n猫は魚が好きです\nThe cat likes fish\n\n次の文…"}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-template">Field order (one field per line)</Label>
            <Textarea
              id="bulk-template"
              value={template}
              onChange={e => setTemplate(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <ol
              className="
                ml-4 list-decimal space-y-0.5 text-xs text-muted-foreground
              "
            >
              {templateFields.map(field => (
                <li key={field}>{FIELD_LABELS[field] ?? field}</li>
              ))}
            </ol>
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="bulk-language">Language</Label>
              <Input
                id="bulk-language"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              />
            </div>
          </div>
        </div>

        {paste.trim()
          ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Preview —
                {" "}
                {parsed.validCount}
                {" "}
                to add
                {parsed.invalidCount > 0 ? ` · ${parsed.invalidCount} skipped (no sentence)` : ""}
              </p>
              <div
                className="
                  max-h-64 space-y-2 overflow-y-auto rounded-md border p-2
                "
              >
                {parsed.items.map((item, i) => (
                  <div
                    key={i}
                    className={`
                      rounded-sm border p-2 text-sm
                      ${item.valid
                    ? ""
                    : "opacity-50"}
                    `}
                  >
                    <p className="font-medium">{item.fields.text || <em>(no sentence — skipped)</em>}</p>
                    {item.fields.correction
                      ? <p className="text-muted-foreground">→ {item.fields.correction}</p>
                      : null}
                    {item.fields.translation
                      ? <p className="text-xs text-muted-foreground">Meant: {item.fields.translation}</p>
                      : null}
                    {item.fields.actualMeaning
                      ? <p className="text-xs text-muted-foreground">Says: {item.fields.actualMeaning}</p>
                      : null}
                    {item.fields.explanation
                      ? <p className="text-xs text-muted-foreground">{item.fields.explanation}</p>
                      : null}
                  </div>
                ))}
              </div>
            </div>
          )
          : null}

        <DialogFooter>
          <Button
            disabled={parsed.validCount === 0 || importMany.isPending}
            onClick={() => void submit()}
          >
            {importMany.isPending
              ? "Adding…"
              : `Add ${parsed.validCount || ""} ${parsed.validCount === 1 ? "sentence" : "sentences"}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
