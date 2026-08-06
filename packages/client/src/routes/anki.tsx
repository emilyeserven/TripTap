import type { ExportItem } from "@/components/ExportPanel";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { ExportPanel } from "@/components/ExportPanel";
import { Button } from "@/components/ui/button";
import { useMySentences } from "@/hooks/useMySentences";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePracticeSentences } from "@/hooks/usePracticeSentences";
import { useRuleGroups, useChunkCards } from "@/hooks/useRuleGroups";
import { useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useVocab } from "@/hooks/useVocab";
import {
  furiganaReading,
  isAnkiSentenceEligible,
  toAnkiChunkText,
  toAnkiContrastText,
  toAnkiSentenceText,
  toAnkiVocabText,
} from "@/lib/anki";

const ANKI_MODES = ["sentences", "vocab", "practice", "my-sentences", "groups", "chunks"] as const;

type AnkiMode = (typeof ANKI_MODES)[number];

export const Route = createFileRoute("/anki")({
  // `?mode=` lets other pages deep-link a specific tab (e.g. the practice "ready to card" nudge).
  validateSearch: (search: Record<string, unknown>): { mode?: AnkiMode } => {
    const mode = ANKI_MODES.find(m => m === search.mode);
    return mode
      ? {
        mode,
      }
      : {};
  },
  component: AnkiPage,
});

const OUTPUT_HINT
  = "Saved in this browser; paste the output into Anki via File → Import (fields separated by Tab).";

function AnkiPage() {
  usePageTitle("Anki export");
  const {
    mode: searchMode,
  } = Route.useSearch();
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
    data: mySentences,
  } = useMySentences();
  const {
    data: sources,
  } = useSources();
  const {
    data: ruleGroups,
  } = useRuleGroups();
  const {
    data: chunkCards,
  } = useChunkCards();

  const [mode, setMode] = useState<AnkiMode>(searchMode ?? "sentences");

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
    // Practice sentences now carry generated furigana like the bank does, so the same flattener applies.
    tertiary: furiganaReading(p.reading),
    eligible: isAnkiSentenceEligible(p),
    sourceId: p.sourceId,
    searchExtra: [p.target, p.nuance],
  })), [practiceSentences]);

  const mySentenceItems: ExportItem[] = useMemo(() => (mySentences ?? []).map((ms) => {
    // Export the corrected form when there is one — your own mistakes-turned-correct are the
    // highest-value SRS material; the uncorrected original never ships alone if a fix exists.
    const corrected = ms.correction?.trim() ? ms.correction : null;
    return {
      id: ms.id,
      label: corrected ?? ms.text,
      sublabel: ms.translation ?? "",
      secondary: ms.translation,
      // The stored furigana was generated from the original text, so only attach it when exporting
      // that original — corrected text would get misaligned readings.
      tertiary: corrected ? null : furiganaReading(ms.reading),
      eligible: Boolean((corrected ?? ms.text).trim() && ms.translation?.trim()),
      sourceId: null,
      searchExtra: [ms.text, ms.translation, ms.explanation],
    };
  }), [mySentences]);

  const groupsById = useMemo(
    () => new Map((ruleGroups ?? []).map(g => [g.id, g])),
    [ruleGroups],
  );
  const groupItems: ExportItem[] = useMemo(() => (ruleGroups ?? []).map(g => ({
    id: g.id,
    label: g.ruleTagKey,
    sublabel: `${g.axis} · ${g.items.length} pairs`,
    secondary: null,
    sourceId: null,
    // Suspended groups are retired — don't re-export them.
    eligible: g.status !== "suspended",
    searchExtra: [g.axis, g.status],
  })), [ruleGroups]);

  const cardsById = useMemo(
    () => new Map((chunkCards ?? []).map(c => [c.id, c])),
    [chunkCards],
  );
  const chunkItems: ExportItem[] = useMemo(() => (chunkCards ?? []).map(c => ({
    id: c.id,
    label: c.chunk,
    sublabel: c.gloss,
    secondary: null,
    sourceId: null,
    eligible: Boolean(c.prompt.trim() && c.answer.trim()),
    searchExtra: [c.prompt, c.gloss],
  })), [chunkCards]);

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
          {
            m: "my-sentences",
            label: "My Sentences",
          },
          {
            m: "groups",
            label: "Rule groups",
          },
          {
            m: "chunks",
            label: "Chunk cards",
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
      {mode === "my-sentences"
        ? (
          <ExportPanel
            items={mySentenceItems}
            sources={undefined}
            storageKey="anki-export-my-sentences"
            pickerHint="Your own sentences with a translation; corrected versions are exported when present."
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
      {mode === "groups"
        ? (
          <ExportPanel
            items={groupItems}
            sources={undefined}
            storageKey="anki-export-groups"
            pickerHint="Each pair is one note (frontA⇥answerA⇥frontB⇥answerB). Import to a 2-template note type so Anki buries siblings."
            outputHint={OUTPUT_HINT}
            outputLabel="Anki export text"
            toText={selected =>
              toAnkiContrastText(
                selected.flatMap(i => groupsById.get(i.id)?.items ?? []),
              )}
          />
        )
        : null}
      {mode === "chunks"
        ? (
          <ExportPanel
            items={chunkItems}
            sources={undefined}
            storageKey="anki-export-chunks"
            pickerHint="One note per card as front⇥back. Your wrong form is never exported."
            outputHint={OUTPUT_HINT}
            outputLabel="Anki export text"
            toText={selected =>
              toAnkiChunkText(
                selected
                  .map(i => cardsById.get(i.id))
                  .filter((c): c is NonNullable<typeof c> => Boolean(c)),
              )}
          />
        )
        : null}
    </section>
  );
}
