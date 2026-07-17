import type { CreateMySentenceInput } from "@sentence-bank/types";

import { useState } from "react";

import { useCreateMySentencesMany } from "../hooks/useMySentences";

import { BulkPasteDialog } from "@/components/BulkPasteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [language, setLanguage] = useState("Japanese");
  const importMany = useCreateMySentencesMany();

  return (
    <BulkPasteDialog
      title="Bulk add sentences"
      description="Paste your sentences below, separating each one with a blank line. Each line within a block maps to a field, in the order set by the template."
      defaultTemplate={DEFAULT_TEMPLATE}
      fieldLabels={FIELD_LABELS}
      pastePlaceholder={"猫は魚が好きだ\n猫は魚が好きです\nThe cat likes fish\n\n次の文…"}
      templateRows={6}
      skippedHint="no sentence"
      nounSingular="sentence"
      nounPlural="sentences"
      isPending={importMany.isPending}
      extraControls={(
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="bulk-language">Language</Label>
          <Input
            id="bulk-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          />
        </div>
      )}
      renderPreview={item => (
        <>
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
        </>
      )}
      onSubmit={async (validItems) => {
        const inputs: CreateMySentenceInput[] = validItems.map((item) => {
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
        await importMany.mutateAsync(inputs);
      }}
    />
  );
}
