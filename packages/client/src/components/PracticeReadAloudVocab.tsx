import type { PracticeSentence } from "@sentence-bank/types";

import { useState } from "react";

import { Plus } from "lucide-react";

import { VocabLinkPicker } from "./VocabLinkPicker";
import {
  usePracticeSentenceVocab,
  useSetPracticeSentenceVocab,
} from "../hooks/usePracticeSentences";
import { useCreateVocab } from "../hooks/useVocab";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The "I had trouble reading it" flow: create real bank vocab for the tricky words and link them to
 * this practice sentence. New vocab is seeded with the sentence's language/source/page/capture, and
 * the words already logged on the card (`words[]`) are offered as one-tap "create & link" chips.
 */
export function PracticeReadAloudVocab({
  practiceSentence: ps,
}: {
  practiceSentence: PracticeSentence;
}) {
  const {
    data: linked,
  } = usePracticeSentenceVocab(ps.id);
  const setVocab = useSetPracticeSentenceVocab();
  const createVocab = useCreateVocab();

  const linkedIds = (linked ?? []).map(v => v.id);
  const [term, setTerm] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");

  const setLinks = (ids: string[]) => setVocab.mutate({
    id: ps.id,
    vocabIds: ids,
  });

  const createAndLink = async (fields: { term: string;
    reading?: string;
    meaning?: string; }) => {
    if (!fields.term.trim()) return;
    const created = await createVocab.mutateAsync({
      term: fields.term.trim(),
      reading: fields.reading?.trim() || null,
      meaning: fields.meaning?.trim() || null,
      language: ps.language,
      sourceId: ps.sourceId,
      page: ps.page,
      captureId: ps.captureId,
    });
    setLinks([...linkedIds, created.id]);
  };

  // Words already logged on the card that aren't yet in the linked set, offered as quick chips.
  const loggedWords = (ps.words ?? []).filter(w => w.w.trim());

  return (
    <div
      className="
        space-y-4 rounded-md border border-l-2 border-primary/40
        border-l-primary bg-muted/40 p-3
      "
    >
      <div>
        <Label className="text-sm">Add the tricky words to your vocab</Label>
        <p className="text-xs text-muted-foreground">
          Anything you couldn&apos;t read becomes a linked vocab entry you can study on its own.
        </p>
      </div>

      {loggedWords.length > 0
        ? (
          <div className="flex flex-wrap gap-1.5">
            {loggedWords.map((w, i) => (
              <Button
                key={i}
                type="button"
                variant="outline"
                size="sm"
                disabled={createVocab.isPending}
                onClick={() => void createAndLink({
                  term: w.w,
                  reading: w.r,
                  meaning: w.m,
                })}
              >
                <Plus className="size-3.5" />
                {w.w}
                {w.r ? ` (${w.r})` : ""}
              </Button>
            ))}
          </div>
        )
        : null}

      <div
        className="
          grid gap-2
          sm:grid-cols-[1.1fr_0.9fr_1.4fr_auto]
        "
      >
        <Input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="word"
        />
        <Input
          value={reading}
          onChange={e => setReading(e.target.value)}
          placeholder="reading"
        />
        <Input
          value={meaning}
          onChange={e => setMeaning(e.target.value)}
          placeholder="meaning"
        />
        <Button
          type="button"
          disabled={!term.trim() || createVocab.isPending}
          onClick={async () => {
            await createAndLink({
              term,
              reading,
              meaning,
            });
            setTerm("");
            setReading("");
            setMeaning("");
          }}
        >
          Create &amp; link
        </Button>
      </div>

      <VocabLinkPicker
        value={linkedIds}
        onChange={setLinks}
      />
    </div>
  );
}
