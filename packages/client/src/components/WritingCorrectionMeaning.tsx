import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMySentence, useUpdateMySentence } from "@/hooks/useMySentences";

/**
 * Inline editor for a corrected sentence's per-sentence meaning, edited without leaving My Writing.
 * These fields (intended meaning, what it actually says) live only on the linked My Sentence — not on
 * the writing's correction copy — so patching the My Sentence directly needs no sync. Autosaves on blur.
 */
export function WritingCorrectionMeaning({
  mySentenceId,
}: { mySentenceId: string }) {
  const {
    data,
  } = useMySentence(mySentenceId);
  const update = useUpdateMySentence();

  const [translation, setTranslation] = useState("");
  const [actualMeaning, setActualMeaning] = useState("");

  // Seed the inputs once the sentence loads (and when switching to a different one).
  useEffect(() => {
    if (!data) return;
    setTranslation(data.translation ?? "");
    setActualMeaning(data.actualMeaning ?? "");
  }, [data]);

  if (!data) return null;

  function saveIfChanged(field: "translation" | "actualMeaning", value: string) {
    const next = value.trim() || null;
    if ((data?.[field] ?? null) === next) return;
    update.mutate({
      id: mySentenceId,
      input: {
        [field]: next,
      },
    });
  }

  return (
    <div
      className="
        grid gap-3
        sm:grid-cols-2
      "
    >
      <div className="space-y-1.5">
        <Label
          htmlFor={`meaning-${mySentenceId}`}
          className="text-xs text-muted-foreground"
        >
          Intended meaning
        </Label>
        <Textarea
          id={`meaning-${mySentenceId}`}
          value={translation}
          onChange={e => setTranslation(e.target.value)}
          onBlur={() => saveIfChanged("translation", translation)}
          placeholder="What this sentence meant to say"
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label
          htmlFor={`actual-${mySentenceId}`}
          className="text-xs text-muted-foreground"
        >
          What it actually says
        </Label>
        <Textarea
          id={`actual-${mySentenceId}`}
          value={actualMeaning}
          onChange={e => setActualMeaning(e.target.value)}
          onBlur={() => saveIfChanged("actualMeaning", actualMeaning)}
          placeholder="The literal reading, if different"
          rows={2}
        />
      </div>
    </div>
  );
}
