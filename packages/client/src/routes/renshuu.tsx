import type { ExportItem } from "@/components/ExportPanel";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { ExportPanel } from "@/components/ExportPanel";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useVocab } from "@/hooks/useVocab";
import { isRenshuuEligible, toRenshuuText, toRenshuuVocabText } from "@/lib/renshuu";

export const Route = createFileRoute("/renshuu")({
  component: RenshuuPage,
});

const OUTPUT_HINT = "Saved in this browser; paste the output into Renshuu.";

function RenshuuPage() {
  usePageTitle("Renshuu export");
  const {
    data: sentences,
  } = useSentences();
  const {
    data: vocab,
  } = useVocab();
  const {
    data: sources,
  } = useSources();

  const [mode, setMode] = useState<"sentences" | "vocab">("sentences");

  const sentenceItems: ExportItem[] = useMemo(() => (sentences ?? []).map(s => ({
    id: s.id,
    label: s.text,
    sublabel: s.translation ?? "",
    secondary: s.translation,
    eligible: isRenshuuEligible(s),
    sourceId: s.sourceId,
    searchExtra: [s.tags, s.notes],
  })), [sentences]);

  const vocabItems: ExportItem[] = useMemo(() => (vocab ?? []).map(v => ({
    id: v.id,
    label: v.term,
    sublabel: [v.reading, v.meaning].filter(Boolean).join(" · "),
    secondary: v.reading,
    eligible: Boolean(v.term.trim()),
    sourceId: v.sourceId,
    searchExtra: [v.meaning, v.tags, v.notes],
  })), [vocab]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Build a list and copy it to paste into a Renshuu lesson — sentences as
          {" "}
          <code>{"<japanese>⇥<english>"}</code>
          , words as
          {" "}
          <code>term/reading</code>
          .
        </p>
      </div>

      <div className="flex gap-2">
        {(["sentences", "vocab"] as const).map(m => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => setMode(m)}
          >
            {m === "sentences" ? "Sentences" : "Vocab"}
          </Button>
        ))}
      </div>

      {mode === "sentences"
        ? (
          <ExportPanel
            items={sentenceItems}
            sources={sources}
            storageKey="renshuu-export"
            pickerHint="Only sentences with a translation can be exported."
            outputHint={OUTPUT_HINT}
            outputLabel="Renshuu export text"
            toText={selected =>
              toRenshuuText(selected.map(i => ({
                text: i.label,
                translation: i.secondary,
              })))}
          />
        )
        : (
          <ExportPanel
            items={vocabItems}
            sources={sources}
            storageKey="renshuu-export-vocab"
            pickerHint="Exported one per line as term/reading."
            outputHint={OUTPUT_HINT}
            outputLabel="Renshuu export text"
            toText={selected =>
              toRenshuuVocabText(selected.map(i => ({
                term: i.label,
                reading: i.secondary,
              })))}
          />
        )}
    </section>
  );
}
