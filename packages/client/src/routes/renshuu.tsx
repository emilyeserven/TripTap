import type { ExportItem } from "@/components/ExportPanel";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { ExportPanel } from "@/components/ExportPanel";
import { Button } from "@/components/ui/button";
import { useMySentences } from "@/hooks/useMySentences";
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
    data: mySentences,
  } = useMySentences();
  const {
    data: sources,
  } = useSources();

  const [mode, setMode] = useState<"sentences" | "vocab" | "my-sentences">("sentences");

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

  // Export the corrected form when there is one — never ship the uncorrected original if a fix exists.
  const mySentenceItems: ExportItem[] = useMemo(() => (mySentences ?? []).map((ms) => {
    const exportText = ms.correction?.trim() ? ms.correction : ms.text;
    return {
      id: ms.id,
      label: exportText,
      sublabel: ms.translation ?? "",
      secondary: ms.translation,
      eligible: Boolean(exportText.trim() && ms.translation?.trim()),
      sourceId: null,
      searchExtra: [ms.text, ms.translation, ms.explanation],
    };
  }), [mySentences]);

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
            m: "my-sentences",
            label: "My Sentences",
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
            storageKey="renshuu-export"
            basketKind="sentence"
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
        : null}
      {mode === "vocab"
        ? (
          <ExportPanel
            items={vocabItems}
            sources={sources}
            storageKey="renshuu-export-vocab"
            basketKind="vocab"
            pickerHint="Exported one per line as term/reading."
            outputHint={OUTPUT_HINT}
            outputLabel="Renshuu export text"
            toText={selected =>
              toRenshuuVocabText(selected.map(i => ({
                term: i.label,
                reading: i.secondary,
              })))}
          />
        )
        : null}
      {mode === "my-sentences"
        ? (
          <ExportPanel
            items={mySentenceItems}
            sources={undefined}
            storageKey="renshuu-export-my-sentences"
            pickerHint="Your own sentences with a translation; corrected versions are exported when present."
            outputHint={OUTPUT_HINT}
            outputLabel="Renshuu export text"
            toText={selected =>
              toRenshuuText(selected.map(i => ({
                text: i.label,
                translation: i.secondary,
              })))}
          />
        )
        : null}
    </section>
  );
}
