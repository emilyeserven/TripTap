import { createFileRoute } from "@tanstack/react-router";

import { SentenceCard } from "../components/SentenceCard";
import { SentenceForm } from "../components/SentenceForm";
import { useDeleteSentence, useSentences } from "../hooks/useSentences";
import { useUiStore } from "../stores/uiStore";

export const Route = createFileRoute("/sentences")({
  component: SentencesPage,
});

function SentencesPage() {
  const {
    data: sentences, isLoading, error,
  } = useSentences();
  const deleteSentence = useDeleteSentence();
  const showTranslations = useUiStore(state => state.showTranslations);
  const toggleShowTranslations = useUiStore(state => state.toggleShowTranslations);

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sentences</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showTranslations}
            onChange={toggleShowTranslations}
          />
          Show translations
        </label>
      </div>

      <SentenceForm />

      <div className="space-y-3">
        {isLoading ? <p className="text-slate-500">Loading sentences…</p> : null}
        {error ? <p className="text-red-600">{error.message}</p> : null}
        {!isLoading && (sentences ?? []).length === 0
          ? (
            <p
              className="text-slate-500"
            >No sentences yet. Add one above.
            </p>
          )
          : null}
        {(sentences ?? []).map(sentence => (
          <SentenceCard
            key={sentence.id}
            sentence={sentence}
            showTranslation={showTranslations}
            onDelete={id => deleteSentence.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}
