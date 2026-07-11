import type { Sentence, Vocab } from "@sentence-bank/types";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCaptureSentences, useCaptureVocab } from "@/hooks/useCaptures";
import { useDeleteSentence, useUpdateSentence } from "@/hooks/useSentences";
import { useDeleteVocab, useUpdateVocab } from "@/hooks/useVocab";

const fieldClass
  = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";
const saveBtn
  = "rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const delBtn = "text-xs text-red-600 hover:underline";

/** Editable list of the sentences and vocab mined from a capture, so they can be tweaked in place. */
export function CaptureCreatedItems({
  captureId,
}: { captureId: string }) {
  const sentences = useCaptureSentences(captureId);
  const vocab = useCaptureVocab(captureId);

  const total = (sentences.data?.length ?? 0) + (vocab.data?.length ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Created from this capture</CardTitle>
        <CardDescription>
          {total === 0
            ? "Nothing created yet — use the workspace above."
            : "Edit or remove the sentences and vocab mined from this capture."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(sentences.data?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Sentences (
              {sentences.data?.length}
              )
            </p>
            {sentences.data?.map(s => (
              <SentenceRow
                key={s.id}
                sentence={s}
              />
            ))}
          </div>
        )}

        {(vocab.data?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Vocab (
              {vocab.data?.length}
              )
            </p>
            {vocab.data?.map(v => (
              <VocabRow
                key={v.id}
                vocab={v}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SentenceRow({
  sentence,
}: { sentence: Sentence }) {
  const update = useUpdateSentence();
  const remove = useDeleteSentence();
  const [text, setText] = useState(sentence.text);
  const [translation, setTranslation] = useState(sentence.translation ?? "");

  const dirty = text !== sentence.text || translation !== (sentence.translation ?? "");

  return (
    <div
      className="
        grid gap-2 rounded-md border border-input p-2
        sm:grid-cols-[1fr_1fr_auto]
      "
    >
      <input
        className={fieldClass}
        aria-label="Sentence text"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <input
        className={fieldClass}
        aria-label="Translation"
        placeholder="Translation"
        value={translation}
        onChange={e => setTranslation(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={saveBtn}
          disabled={!dirty || !text.trim() || update.isPending}
          onClick={() => update.mutate({
            id: sentence.id,
            input: {
              text: text.trim(),
              translation: translation.trim() || null,
            },
          })}
        >
          {update.isPending ? "…" : "Save"}
        </button>
        <button
          type="button"
          className={delBtn}
          onClick={() => remove.mutate(sentence.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function VocabRow({
  vocab,
}: { vocab: Vocab }) {
  const update = useUpdateVocab();
  const remove = useDeleteVocab();
  const [term, setTerm] = useState(vocab.term);
  const [reading, setReading] = useState(vocab.reading ?? "");
  const [meaning, setMeaning] = useState(vocab.meaning ?? "");

  const dirty
    = term !== vocab.term
      || reading !== (vocab.reading ?? "")
      || meaning !== (vocab.meaning ?? "");

  return (
    <div
      className="
        grid gap-2 rounded-md border border-input p-2
        sm:grid-cols-[1fr_1fr_1fr_auto]
      "
    >
      <input
        className={fieldClass}
        aria-label="Term"
        value={term}
        onChange={e => setTerm(e.target.value)}
      />
      <input
        className={fieldClass}
        aria-label="Reading"
        placeholder="Reading"
        value={reading}
        onChange={e => setReading(e.target.value)}
      />
      <input
        className={fieldClass}
        aria-label="Meaning"
        placeholder="Meaning"
        value={meaning}
        onChange={e => setMeaning(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={saveBtn}
          disabled={!dirty || !term.trim() || update.isPending}
          onClick={() => update.mutate({
            id: vocab.id,
            input: {
              term: term.trim(),
              reading: reading.trim() || null,
              meaning: meaning.trim() || null,
            },
          })}
        >
          {update.isPending ? "…" : "Save"}
        </button>
        <button
          type="button"
          className={delBtn}
          onClick={() => remove.mutate(vocab.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
