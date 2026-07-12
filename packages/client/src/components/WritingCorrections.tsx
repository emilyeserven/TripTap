import type { Writing } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { CheckCircle2, PlusIcon } from "lucide-react";

import { useCreateMySentence } from "../hooks/useMySentences";
import { useUpdateWriting } from "../hooks/useWritings";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
 * Correction mode for a writing: each sentence gets a `+` to add a correction. Officially adding one
 * creates a My Sentence (original text + corrected version, tagged with the writing's terms and linked
 * back to it) and records the correction inline on the writing. Already-corrected sentences link to
 * their My Sentence instead of offering a fresh `+`.
 */
export function WritingCorrections({
  writing,
  text,
}: {
  writing: Writing;
  text: string;
}) {
  const createMySentence = useCreateMySentence();
  const updateWriting = useUpdateWriting();
  const [editing, setEditing] = useState<number | null>(null);
  const [corrected, setCorrected] = useState("");
  const [note, setNote] = useState("");

  const segments = splitSentences(text);
  const corrections = writing.corrections ?? [];
  const correctionFor = (segment: string) =>
    corrections.find(c => c.original.trim() === segment.trim());

  const busy = createMySentence.isPending || updateWriting.isPending;

  const open = (index: number, segment: string) => {
    setEditing(index);
    setCorrected(segment);
    setNote("");
  };

  const cancel = () => {
    setEditing(null);
    setCorrected("");
    setNote("");
  };

  const officiallyAdd = async (original: string) => {
    try {
      const created = await createMySentence.mutateAsync({
        text: original,
        correction: corrected.trim() || null,
        needsCorrection: false,
        translation: writing.meaning,
        language: writing.language,
        writingId: writing.id,
        terms: writing.terms,
      });
      const next = [
        ...corrections,
        {
          id: crypto.randomUUID(),
          original,
          corrected: corrected.trim(),
          note: note.trim() || null,
          mySentenceId: created.id,
        },
      ];
      await updateWriting.mutateAsync({
        id: writing.id,
        input: {
          corrections: next,
        },
      });
      cancel();
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg">{segment}</p>
                {existing
                  ? (
                    <Link
                      to="/my-sentences"
                      className="
                        inline-flex items-center gap-1 text-sm text-primary
                        hover:underline
                      "
                    >
                      <CheckCircle2 className="size-4" />
                      Corrected — in My Sentences
                    </Link>
                  )
                  : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => open(index, segment)}
                      disabled={editing === index}
                    >
                      <PlusIcon className="size-4" />
                      Correct
                    </Button>
                  )}
              </div>

              {existing?.note
                ? (
                  <p
                    className="mt-1 text-sm text-muted-foreground"
                  >{existing.note}
                  </p>
                )
                : null}

              {editing === index && !existing
                ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Corrected version</Label>
                      <Textarea
                        value={corrected}
                        onChange={e => setCorrected(e.target.value)}
                        placeholder="Write the corrected sentence…"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Note (optional)</Label>
                      <Textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="What changed and why…"
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => void officiallyAdd(segment)}
                        disabled={busy || !corrected.trim()}
                      >
                        Add to My Sentences
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancel}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
                : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
