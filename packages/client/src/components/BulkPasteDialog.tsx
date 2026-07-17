import type { ParsedItem } from "@/lib/parseTemplate";
import type { ReactNode } from "react";

import { useMemo, useState } from "react";

import { Upload } from "lucide-react";

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
import { parseTemplate } from "@/lib/parseTemplate";

/**
 * Shared scaffold for the "Bulk add" paste dialogs (My Sentences, Writing Prompts): a paste box and
 * an editable `{{field}}`-per-line template, a live preview of the parsed blocks, and a submit
 * button. Feature dialogs own their extra per-batch controls (language, difficulty) and map the
 * parsed fields to their create inputs in `onSubmit`.
 */
export function BulkPasteDialog({
  title,
  description,
  defaultTemplate,
  fieldLabels,
  pastePlaceholder,
  templateRows,
  skippedHint,
  nounSingular,
  nounPlural,
  extraControls,
  onReset,
  renderPreview,
  isPending,
  onSubmit,
}: {
  title: string;
  description: string;
  defaultTemplate: string;
  /** Human labels for the template fields, shown as a legend so the user knows the line order. */
  fieldLabels: Record<string, string>;
  pastePlaceholder: string;
  templateRows: number;
  /** Why an invalid block is skipped, e.g. "no sentence". */
  skippedHint: string;
  nounSingular: string;
  nounPlural: string;
  /** Extra per-batch controls (language, difficulty) rendered under the field legend. */
  extraControls?: ReactNode;
  /** Reset any parent-owned extra-control state when the dialog closes or a batch is added. */
  onReset?: () => void;
  /** Preview body for one parsed block (the invalid-dimming wrapper is shared). */
  renderPreview: (item: ParsedItem) => ReactNode;
  isPending: boolean;
  onSubmit: (validItems: ParsedItem[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [template, setTemplate] = useState(defaultTemplate);

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
    setTemplate(defaultTemplate);
    onReset?.();
  };

  const submit = async () => {
    const valid = parsed.items.filter(item => item.valid);
    if (valid.length === 0) return;
    await onSubmit(valid);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
              placeholder={pastePlaceholder}
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
              rows={templateRows}
              className="font-mono text-sm"
            />
            <ol
              className="
                ml-4 list-decimal space-y-0.5 text-xs text-muted-foreground
              "
            >
              {templateFields.map(field => (
                <li key={field}>{fieldLabels[field] ?? field}</li>
              ))}
            </ol>
            {extraControls}
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
                {parsed.invalidCount > 0 ? ` · ${parsed.invalidCount} skipped (${skippedHint})` : ""}
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
                    {renderPreview(item)}
                  </div>
                ))}
              </div>
            </div>
          )
          : null}

        <DialogFooter>
          <Button
            disabled={parsed.validCount === 0 || isPending}
            onClick={() => void submit()}
          >
            {isPending
              ? "Adding…"
              : `Add ${parsed.validCount || ""} ${parsed.validCount === 1 ? nounSingular : nounPlural}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
