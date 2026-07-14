import type { DragEndEvent } from "@dnd-kit/core";
import type { Sentence, SentenceTermRef, Vocab } from "@sentence-bank/types";

import { useState } from "react";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { VocabCard } from "@/components/ai-lesson/VocabCard";
import { SentenceCard } from "@/components/SentenceCard";
import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCaptureSentences, useCaptureVocab, useReorderCaptureSentences } from "@/hooks/useCaptures";
import { useDeleteSentence, useUpdateSentence } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useDeleteVocab, useUpdateVocab } from "@/hooks/useVocab";
import { groupTermsByCategory, termsChanged } from "@/lib/terms";
import { cn } from "@/lib/utils";
import { vocabToCardItem } from "@/lib/vocab-card";

const fieldClass
  = "w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";
const saveBtn
  = "rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50";
const delBtn = "text-xs text-red-600 hover:underline";

/** The sentences and vocab mined from a capture — viewable as cards or editable in place. */
export function CaptureCreatedItems({
  captureId,
}: { captureId: string }) {
  const sentences = useCaptureSentences(captureId);
  const vocab = useCaptureVocab(captureId);
  const {
    data: sources,
  } = useSources();
  const [mode, setMode] = useState<"view" | "edit">("view");

  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);

  const sentenceItems = sentences.data ?? [];
  const vocabItems = vocab.data ?? [];
  const total = sentenceItems.length + vocabItems.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle>Created from this capture</CardTitle>
            <CardDescription>
              {total === 0
                ? "Nothing created yet — use the workspace above."
                : mode === "view"
                  ? "The sentences and vocab mined from this capture."
                  : "Edit or remove the sentences and vocab mined from this capture."}
            </CardDescription>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "view" ? "default" : "outline"}
                onClick={() => setMode("view")}
              >
                View
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "edit" ? "default" : "outline"}
                onClick={() => setMode("edit")}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "view"
          ? (
            <FuriganaScope>
              {vocabItems.length > 0 && (
                <div className="mb-2 flex justify-end">
                  <FuriganaToggle />
                </div>
              )}
              {sentenceItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Sentences (
                    {sentenceItems.length}
                    )
                  </p>
                  <div className="space-y-4">
                    {sentenceItems.map(s => (
                      <SentenceCard
                        key={s.id}
                        sentence={s}
                        sourceName={sourceName(s.sourceId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {vocabItems.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">
                    Vocab (
                    {vocabItems.length}
                    )
                  </p>
                  <div
                    className="
                      grid gap-3
                      sm:grid-cols-2
                      lg:grid-cols-3
                    "
                  >
                    {vocabItems.map(v => (
                      <VocabCard
                        key={v.id}
                        vocab={vocabToCardItem(v)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </FuriganaScope>
          )
          : (
            <>
              {sentenceItems.length > 0 && (
                <div className="space-y-2">
                  <div
                    className="
                      flex flex-wrap items-baseline justify-between gap-x-2
                    "
                  >
                    <p className="text-sm font-medium text-slate-700">
                      Sentences (
                      {sentenceItems.length}
                      )
                    </p>
                    {sentenceItems.length > 1 && (
                      <p className="text-xs text-muted-foreground">Drag the handle to reorder.</p>
                    )}
                  </div>
                  {sentenceItems.length > 1
                    ? (
                      <SortableSentences
                        captureId={captureId}
                        sentences={sentenceItems}
                      />
                    )
                    : (
                      sentenceItems.map(s => (
                        <SentenceRow
                          key={s.id}
                          sentence={s}
                        />
                      ))
                    )}
                </div>
              )}

              {vocabItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Vocab (
                    {vocabItems.length}
                    )
                  </p>
                  {vocabItems.map(v => (
                    <VocabRow
                      key={v.id}
                      vocab={v}
                    />
                  ))}
                </div>
              )}
            </>
          )}
      </CardContent>
    </Card>
  );
}

/** Drag-and-drop wrapper around the edit-mode sentence rows; persists the new order on drop. */
function SortableSentences({
  captureId,
  sentences,
}: { captureId: string;
  sentences: Sentence[]; }) {
  const reorder = useReorderCaptureSentences(captureId);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = sentences.map(s => s.id);

  function onDragEnd(event: DragEndEvent) {
    const {
      active, over,
    } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    reorder.mutate(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {sentences.map(s => (
            <SortableSentenceRow
              key={s.id}
              sentence={s}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** One draggable sentence: a grip handle beside the in-place editor. */
function SortableSentenceRow({
  sentence,
}: { sentence: Sentence }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: sentence.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("flex items-stretch gap-2", isDragging && `
        relative z-10 opacity-70
      `)}
    >
      <button
        type="button"
        className="
          flex shrink-0 cursor-grab touch-none items-center rounded-md px-1
          text-muted-foreground
          hover:text-foreground
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-ring
          active:cursor-grabbing
        "
        aria-label="Drag to reorder sentence"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <SentenceRow sentence={sentence} />
      </div>
    </div>
  );
}

function SentenceRow({
  sentence,
}: { sentence: Sentence }) {
  const update = useUpdateSentence();
  const remove = useDeleteSentence();
  const [text, setText] = useState(sentence.text);
  const [translation, setTranslation] = useState(sentence.translation ?? "");
  const [vocabTerms, setVocabTerms] = useState<SentenceTermRef[]>(
    () => groupTermsByCategory(sentence.terms ?? []).vocabulary,
  );
  const [grammarTerms, setGrammarTerms] = useState<SentenceTermRef[]>(
    () => groupTermsByCategory(sentence.terms ?? []).grammar,
  );
  const [generalTerms, setGeneralTerms] = useState<SentenceTermRef[]>(
    () => groupTermsByCategory(sentence.terms ?? []).general,
  );
  const [resourceTerms, setResourceTerms] = useState<SentenceTermRef[]>(
    () => groupTermsByCategory(sentence.terms ?? []).resource,
  );
  const terms = [...vocabTerms, ...grammarTerms, ...generalTerms, ...resourceTerms];

  const dirty
    = text !== sentence.text
      || translation !== (sentence.translation ?? "")
      || termsChanged(terms, sentence.terms ?? []);

  return (
    <div className="space-y-2 rounded-md border border-input p-2">
      <div
        className="
          grid gap-2
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
                terms: terms.length > 0 ? terms : null,
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
      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <TermPicker
          category="vocabulary"
          label="Vocabulary tags"
          value={vocabTerms}
          onChange={setVocabTerms}
        />
        <TermPicker
          category="grammar"
          label="Grammar tags"
          value={grammarTerms}
          onChange={setGrammarTerms}
        />
        <TermPicker
          category="general"
          label="General tags"
          value={generalTerms}
          onChange={setGeneralTerms}
        />
        <TermPicker
          category="resource"
          label="Textbook / Worksheet"
          value={resourceTerms}
          onChange={setResourceTerms}
        />
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
