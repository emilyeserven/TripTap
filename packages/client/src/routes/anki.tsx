import type { ExportItem } from "@/components/ExportPanel";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { ExportPanel } from "@/components/ExportPanel";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePracticeSentences } from "@/hooks/usePracticeSentences";
import { useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useVocab } from "@/hooks/useVocab";
import { furiganaReading, isAnkiSentenceEligible, toAnkiSentenceText, toAnkiVocabText } from "@/lib/anki";

export const Route = createFileRoute("/anki")({
  component: AnkiPage,
});

const OUTPUT_HINT
  = "Saved in this browser; paste the output into Anki via File → Import (fields separated by Tab).";

function AnkiPage() {
  usePageTitle("Anki export");
  const {
    data: sentences,
  } = useSentences();
  const {
    data: vocab,
  } = useVocab();
  const {
    data: practiceSentences,
  } = usePracticeSentences();
  const {
    data: sources,
  } = useSources();

  const [mode, setMode] = useState<"sentences" | "vocab" | "practice">("sentences");

  const sentenceItems: ExportItem[] = useMemo(() => (sentences ?? []).map(s => ({
    id: s.id,
    label: s.text,
    sublabel: s.translation ?? "",
    secondary: s.translation,
    tertiary: furiganaReading(s.reading),
    eligible: isAnkiSentenceEligible(s),
    sourceId: s.sourceId,
    searchExtra: [s.tags, s.notes],
  })), [sentences]);

  const vocabItems: ExportItem[] = useMemo(() => (vocab ?? []).map(v => ({
    id: v.id,
    label: v.term,
    sublabel: [v.reading, v.meaning].filter(Boolean).join(" · "),
    secondary: v.reading,
    tertiary: v.meaning,
    eligible: Boolean(v.term.trim()),
    sourceId: v.sourceId,
    searchExtra: [v.meaning, v.tags, v.notes],
  })), [vocab]);

  const practiceItems: ExportItem[] = useMemo(() => (practiceSentences ?? []).map(p => ({
    id: p.id,
    label: p.text,
    sublabel: p.translation ?? "",
    secondary: p.translation,
    // Practice `reading` is already a plain string (not FuriToken[]), so no conversion is needed.
    tertiary: p.reading,
    eligible: isAnkiSentenceEligible(p),
    sourceId: p.sourceId,
    searchExtra: [p.target, p.nuance],
  })), [practiceSentences]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Build a list and copy tab-separated notes to import into Anki — sentences as
          {" "}
          <code>expression⇥meaning⇥reading</code>
          , words as
          {" "}
          <code>term⇥reading⇥meaning</code>
          .
        </p>
      </div>

      <div className="flex gap-2">
        {([
          {
            m: "sentences",
            label: "Sentences",
          },
          {
            m: "vocab",
            label: "Vocab",
          },
          {
            m: "practice",
            label: "Practice",
          },
        ] as const).map(({
          m, label,
        }) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
          >
            {label}
          </Button>
        ))}
      </div>

      {mode === "sentences"
        ? (
          <ExportPanel
            items={sentenceItems}
            sources={sources}
            storageKey="anki-export"
            pickerHint="Only sentences with a translation can be exported."
            outputHint={OUTPUT_HINT}
            outputLabel="Anki export text"
            toText={selected =>
              toAnkiSentenceText(selected.map(i => ({
                text: i.label,
                translation: i.secondary,
                reading: i.tertiary ?? null,
              })))}
          />
        )
        : null}
      {mode === "vocab"
        ? (
          <ExportPanel
            items={vocabItems}
            sources={sources}
            storageKey="anki-export-vocab"
            pickerHint="Exported one per line as term, reading, meaning."
            outputHint={OUTPUT_HINT}
            outputLabel="Anki export text"
            toText={selected =>
              toAnkiVocabText(selected.map(i => ({
                term: i.label,
                reading: i.secondary,
                meaning: i.tertiary ?? null,
              })))}
          />
        )
        : null}
      {mode === "practice"
        ? (
          <ExportPanel
            items={practiceItems}
            sources={sources}
            storageKey="anki-export-practice"
            pickerHint="Practice sentences with a translation. Use Anki's reversed note type for E→J cards."
            outputHint={OUTPUT_HINT}
            outputLabel="Anki export text"
            toText={selected =>
              toAnkiSentenceText(selected.map(i => ({
                text: i.label,
                translation: i.secondary,
                reading: i.tertiary ?? null,
              })))}
          />
        )
        : null}
    </section>
  );
}
