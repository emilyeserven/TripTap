import type { SentenceCorrectionResult } from "@/components/SentenceCorrector";
import type { Writing, WritingCorrection } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, PlusIcon } from "lucide-react";

import { CorrectionDiff } from "../lib/sentenceDiff";

import { SentenceCorrector } from "@/components/SentenceCorrector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCreateMySentence, useUpdateMySentence } from "@/hooks/useMySentences";
import { useUpdateWriting } from "@/hooks/useWritings";

/**
 * Split free-form text into sentence segments. A boundary is any run of terminal punctuation
 * (。！？.!?) or the end of a non-empty line — so an unpunctuated line still counts as one sentence.
 */
function splitSentences(text: string): string[] {
  const segments: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const matches = line.match(/[^。！？.!?]*[。！？.!?]+|[^。！？.!?]+$/g) ?? [line];
    for (const m of matches) {
      const trimmed = m.trim();
      if (trimmed) segments.push(trimmed);
    }
  }
  return segments;
}

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
  // Which corrections are showing their original-vs-corrected diff.
  const [showOriginal, setShowOriginal] = useState<Set<string>>(() => new Set());

  const segments = splitSentences(text);
  const corrections = writing.corrections ?? [];
  const correctionFor = (segment: string) =>
    corrections.find(c => c.original.trim() === segment.trim());

  const toggleOriginal = (id: string) =>
    setShowOriginal((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const officiallyAdd = async (original: string, r: SentenceCorrectionResult) => {
    try {
      const created = await createMySentence.mutateAsync({
        text: original,
        correction: r.correction.trim() || null,
        marks: r.marks,
        explanation: r.reasoning,
        needsCorrection: false,
        translation: writing.meaning,
        language: writing.language,
        writingId: writing.id,
        terms: writing.terms,
      });
      const next: WritingCorrection[] = [
        ...corrections,
        {
          id: crypto.randomUUID(),
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

  return (
    <div className="space-y-2">
      <Label className="text-sm">Correction mode</Label>
      <p className="text-xs text-muted-foreground">
        Click
        {" "}
        <PlusIcon className="inline size-3" />
        {" "}
        after a sentence to correct it and add it to My Sentences.
      </p>
      <ol className="space-y-2">
        {segments.map((segment, index) => {
          const existing = correctionFor(segment);
          return (
            <li
              key={`${index}-${segment}`}
              className="rounded-md border p-3"
            >
              {existing
                ? (
                  <div className="space-y-2">
                    <div
                      className="
                        flex flex-wrap items-center justify-between gap-2
                      "
                    >
                      {editingId === existing.id
                        ? <span className="text-lg font-semibold">Edit your correction</span>
                        : <p className="text-lg">{existing.corrected || segment}</p>}
                      <div className="flex shrink-0 items-center gap-1">
                        <Link
                          to="/my-sentences"
                          className="
                            inline-flex items-center gap-1 text-sm text-primary
                            hover:underline
                          "
                        >
                          <CheckCircle2 className="size-4" />
                          In My Sentences
                        </Link>
                        {editingId === existing.id
                          ? null
                          : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(existing.id)}
                            >
                              Edit corrections
                            </Button>
                          )}
                      </div>
                    </div>

                    {editingId === existing.id
                      ? (
                        <SentenceCorrector
                          text={existing.corrected || segment}
                          reasoning={existing.note}
                          onSave={r => void saveEdit(existing, r)}
                        />
                      )
                      : (
                        <>
                          {existing.note
                            ? <p className="text-sm text-muted-foreground">{existing.note}</p>
                            : null}
                          <div className="space-y-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOriginal(existing.id)}
                            >
                              {showOriginal.has(existing.id)
                                ? <EyeOff className="size-4" />
                                : <Eye className="size-4" />}
                              {showOriginal.has(existing.id) ? "Hide original" : "Show your original"}
                            </Button>
                            {showOriginal.has(existing.id)
                              ? (
                                <div
                                  className="
                                    space-y-1 rounded-md border bg-muted/30 p-2
                                  "
                                >
                                  <CorrectionDiff
                                    written={existing.original}
                                    correct={existing.corrected}
                                    language={writing.language}
                                  />
                                </div>
                              )
                              : null}
                          </div>
                        </>
                      )}
                  </div>
                )
                : (
                  <div className="space-y-2">
                    <div
                      className="
                        flex flex-wrap items-center justify-between gap-2
                      "
                    >
                      {addingIndex === index
                        ? <span className="text-lg font-semibold">Correct your sentence</span>
                        : <p className="text-lg">{segment}</p>}
                      {addingIndex === index
                        ? null
                        : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAddingIndex(index)}
                          >
                            <PlusIcon className="size-4" />
                            Correct
                          </Button>
                        )}
                    </div>

                    {addingIndex === index
                      ? (
                        <SentenceCorrector
                          text={segment}
                          onSave={r => void officiallyAdd(segment, r)}
                          saveLabel="Add to My Sentences"
                        />
                      )
                      : null}
                  </div>
                )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
