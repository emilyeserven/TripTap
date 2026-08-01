import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";
import type { Writing, WritingCorrection } from "@sentence-bank/types";

import { useState } from "react";

import { PlusIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { WritingCorrectedSegment } from "@/components/WritingCorrectedSegment";
import { WritingUncorrectedSegment } from "@/components/WritingUncorrectedSegment";
import { useCreateMySentence, useUpdateMySentence } from "@/hooks/useMySentences";
import { useUpdateWriting } from "@/hooks/useWritings";
import { newId } from "@/lib/id";
import { splitLines } from "@/lib/writing-corrections";

/**
 * Correction mode for a writing — the same track-changes flow as My Sentences and Answer Sheets. Each
 * sentence gets a `+` opening the inline {@link SentenceCorrector} (select a span → Correct/Incorrect,
 * derive `{ correction, marks }`, add an explanation). Saving creates a My Sentence carrying the
 * correction, marks, and explanation (tagged with the writing's terms and linked back to it) and
 * records the correction inline on the writing. Already-corrected sentences lead with the fix, hide the
 * original behind a "Show your original" diff, and offer "Edit corrections" to revise it (and the
 * linked My Sentence) in place.
 */
export function WritingCorrections({
  writing,
  text,
}: {
  writing: Writing;
  text: string;
}) {
  const createMySentence = useCreateMySentence();
  const updateMySentence = useUpdateMySentence();
  const updateWriting = useUpdateWriting();
  // Which uncorrected segment (by index) is open for a first-time correction.
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  // Which existing correction (by id) is open for re-editing.
  const [editingId, setEditingId] = useState<string | null>(null);

  const segments = splitLines(text);
  const corrections = writing.corrections ?? [];
  const correctionFor = (segment: string) =>
    corrections.find(c => c.original.trim() === segment.trim());

  const officiallyAdd = async (original: string, r: SentenceCorrectionResult) => {
    try {
      const created = await createMySentence.mutateAsync({
        text: original,
        correction: r.correction.trim() || null,
        marks: r.marks,
        explanation: r.reasoning,
        needsCorrection: false,
        // Per-sentence intended meaning is set inline on the corrected card — don't inherit the whole
        // writing's meaning, which belongs to the piece, not one sentence.
        translation: null,
        language: writing.language,
        writingId: writing.id,
        terms: writing.terms,
      });
      const next: WritingCorrection[] = [
        ...corrections,
        {
          id: newId(),
          original,
          corrected: r.correction.trim(),
          note: r.reasoning,
          marks: r.marks,
          mySentenceId: created.id,
        },
      ];
      await updateWriting.mutateAsync({
        id: writing.id,
        input: {
          corrections: next,
        },
      });
      setAddingIndex(null);
    }
    catch {
      // Errors are surfaced by the mutations' onError toasts; keep the editor open for a retry.
    }
  };

  const saveEdit = async (existing: WritingCorrection, r: SentenceCorrectionResult) => {
    try {
      if (existing.mySentenceId) {
        await updateMySentence.mutateAsync({
          id: existing.mySentenceId,
          input: {
            correction: r.correction.trim() || null,
            marks: r.marks,
            explanation: r.reasoning,
          },
        });
      }
      const next = corrections.map(c =>
        c.id === existing.id
          ? {
            ...c,
            corrected: r.correction.trim(),
            note: r.reasoning,
            marks: r.marks,
          }
          : c);
      await updateWriting.mutateAsync({
        id: writing.id,
        input: {
          corrections: next,
        },
      });
      setEditingId(null);
    }
    catch {
      // Errors are surfaced by the mutations' onError toasts; keep the editor open for a retry.
    }
  };

  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to correct yet — write a sentence, then come back to correction mode.
      </p>
    );
  }

  // Split into a working list (still to correct) and a separate, read-only "Corrected" area, so a
  // finished sentence can't be re-corrected by accident.
  const items = segments.map((segment, index) => ({
    segment,
    index,
    existing: correctionFor(segment),
  }));
  const uncorrected = items.filter(i => !i.existing);
  const corrected = items.filter((i): i is typeof i & { existing: WritingCorrection } =>
    Boolean(i.existing));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm">Correction mode</Label>
        <p className="text-xs text-muted-foreground">
          Click
          {" "}
          <PlusIcon className="inline size-3" />
          {" "}
          after a sentence to correct it and add it to My Sentences.
        </p>
        {uncorrected.length === 0
          ? (
            <p className="text-sm text-muted-foreground">
              Every sentence has been corrected.
            </p>
          )
          : (
            <ol className="space-y-2">
              {uncorrected.map(({
                segment, index,
              }) => (
                <li
                  key={`${index}-${segment}`}
                  className="rounded-md border p-3"
                >
                  <WritingUncorrectedSegment
                    segment={segment}
                    adding={addingIndex === index}
                    onStartAdd={() => setAddingIndex(index)}
                    onSave={r => void officiallyAdd(segment, r)}
                  />
                </li>
              ))}
            </ol>
          )}
      </div>

      {corrected.length > 0
        ? (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Corrected ({corrected.length})
            </Label>
            <ul className="space-y-2">
              {corrected.map(({
                index, segment, existing,
              }) => (
                <li
                  key={`${index}-${segment}`}
                  className="rounded-md border bg-muted/20 p-3"
                >
                  <WritingCorrectedSegment
                    correction={existing}
                    language={writing.language}
                    editing={editingId === existing.id}
                    onStartEdit={() => setEditingId(existing.id)}
                    onSaveEdit={r => void saveEdit(existing, r)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
        : null}
    </div>
  );
}
