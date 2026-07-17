import type { CreateWritingPromptInput, WritingPromptDifficulty } from "@sentence-bank/types";

import { useState } from "react";

import { BulkPasteDialog } from "@/components/BulkPasteDialog";
import { DifficultySelect } from "@/components/DifficultySelect";
import { Label } from "@/components/ui/label";
import { useCreateWritingPromptsMany } from "@/hooks/useWritingPrompts";

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
  const [difficulty, setDifficulty] = useState<WritingPromptDifficulty>("Other");
  const importMany = useCreateWritingPromptsMany();

  return (
    <BulkPasteDialog
      title="Bulk add prompts"
      description="Paste your prompts below, separating each one with a blank line. Each line within a block maps to a field, in the order set by the template."
      defaultTemplate={DEFAULT_TEMPLATE}
      fieldLabels={FIELD_LABELS}
      pastePlaceholder={"朝の習慣について書いてください\nWrite about your morning routine\n\n次のプロンプト…"}
      templateRows={4}
      skippedHint="no Japanese"
      nounSingular="prompt"
      nounPlural="prompts"
      isPending={importMany.isPending}
      onReset={() => setDifficulty("Other")}
      extraControls={(
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="bulk-difficulty">Difficulty (applied to all)</Label>
          <DifficultySelect
            id="bulk-difficulty"
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>
      )}
      renderPreview={item => (
        <>
          <p className="font-medium">{item.fields.text || <em>(no Japanese — skipped)</em>}</p>
          {item.fields.textEn
            ? <p className="text-xs text-muted-foreground">{item.fields.textEn}</p>
            : null}
        </>
      )}
      onSubmit={async (validItems) => {
        const inputs: CreateWritingPromptInput[] = validItems.map(item => ({
          text: item.fields.text.trim(),
          textEn: item.fields.textEn?.trim() || null,
          difficulty,
        }));
        await importMany.mutateAsync(inputs);
      }}
    />
  );
}
