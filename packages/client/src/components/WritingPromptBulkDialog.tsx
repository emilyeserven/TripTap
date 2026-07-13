import type { CreateWritingPromptInput, WritingPromptDifficulty } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { Upload } from "lucide-react";

import { DifficultySelect } from "@/components/DifficultySelect";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateWritingPromptsMany } from "@/hooks/useWritingPrompts";
import { parseTemplate } from "@/lib/parseTemplate";

/** Default per-prompt field order: Japanese line, then English line, blocks separated by a blank line. */
const DEFAULT_TEMPLATE = [
  "{{text}}",
  "{{textEn}}",
].join("\n");

/** Human labels for the fields, shown as a legend so the user knows the line order. */
const FIELD_LABELS: Record<string, string> = {
  text: "Japanese",
  textEn: "English",
};

/**
 * Bulk-add Writing Prompts by pasting Japanese/English blocks. Each block is a Japanese line then an
 * English line, blocks separated by a blank line. One difficulty tag applies to the whole batch. A live
 * preview shows exactly what will be created before confirming.
 */
export function WritingPromptBulkDialog() {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [difficulty, setDifficulty] = useState<WritingPromptDifficulty>("Other");
  const importMany = useCreateWritingPromptsMany();

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
    setDifficulty("Other");
  };

  const submit = async () => {
    const inputs: CreateWritingPromptInput[] = parsed.items
      .filter(item => item.valid)
      .map(item => ({
        text: item.fields.text.trim(),
        textEn: item.fields.textEn?.trim() || null,
        difficulty,
      }));
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
          <DialogTitle>Bulk add prompts</DialogTitle>
          <DialogDescription>
            Paste your prompts below, separating each one with a blank line. Each line within a block
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
              placeholder={"朝の習慣について書いてください\nWrite about your morning routine\n\n次のプロンプト…"}
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
              rows={4}
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
              <Label htmlFor="bulk-difficulty">Difficulty (applied to all)</Label>
              <DifficultySelect
                id="bulk-difficulty"
                value={difficulty}
                onChange={setDifficulty}
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
                {parsed.invalidCount > 0 ? ` · ${parsed.invalidCount} skipped (no Japanese)` : ""}
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
                    <p className="font-medium">{item.fields.text || <em>(no Japanese — skipped)</em>}</p>
                    {item.fields.textEn
                      ? <p className="text-xs text-muted-foreground">{item.fields.textEn}</p>
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
              : `Add ${parsed.validCount || ""} ${parsed.validCount === 1 ? "prompt" : "prompts"}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
