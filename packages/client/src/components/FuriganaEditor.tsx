import type { FuriToken, Sentence } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegenerateFurigana, useUpdateSentence } from "@/hooks/useSentences";

const KANJI = /[㐀-䶿一-鿿々]/;

/**
 * Edit a sentence's furigana by hand: change or clear (blank = no ruby) the reading on each kanji run.
 * "Regenerate" re-runs the analyzer (applying current vocab overrides). Kanji tokens stay editable
 * even after their reading is cleared, so a mis-read name can be blanked and left blank.
 */
export function FuriganaEditor({
  sentence,
  onClose,
}: {
  sentence: Sentence;
  onClose: () => void;
}) {
  const update = useUpdateSentence();
  const regen = useRegenerateFurigana();
  const [tokens, setTokens] = useState<FuriToken[]>(sentence.reading ?? []);

  const editable = tokens.map((_, i) => i).filter(i => KANJI.test(tokens[i].t));

  function setReading(index: number, value: string) {
    setTokens(prev => prev.map((t, i) => (i === index
      ? {
        ...t,
        r: value.trim() ? value : null,
      }
      : t)));
  }
  function save() {
    update.mutate({
      id: sentence.id,
      input: {
        reading: tokens,
      },
    }, {
      onSuccess: onClose,
    });
  }
  function regenerate() {
    regen.mutate(sentence.id, {
      onSuccess: s => setTokens(s.reading ?? []),
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">
        Edit or clear readings (blank = no furigana). To fix a name everywhere, add it to Vocab with its
        reading and Regenerate.
      </p>
      {tokens.length === 0
        ? <p className="text-sm text-muted-foreground">No furigana yet — Regenerate to create it.</p>
        : editable.length === 0
          ? <p className="text-sm text-muted-foreground">No kanji to annotate.</p>
          : (
            <div className="flex flex-wrap gap-2">
              {editable.map(i => (
                <label
                  key={i}
                  className="flex items-center gap-1 text-sm"
                >
                  <span className="font-medium">{tokens[i].t}</span>
                  <Input
                    className="h-7 w-24"
                    value={tokens[i].r ?? ""}
                    onChange={e => setReading(i, e.target.value)}
                    placeholder="—"
                    aria-label={`Reading for ${tokens[i].t}`}
                  />
                </label>
              ))}
            </div>
          )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={save}
          disabled={update.isPending}
        >
          {update.isPending ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={regenerate}
          disabled={regen.isPending}
        >
          {regen.isPending ? "Regenerating…" : "Regenerate (auto)"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
