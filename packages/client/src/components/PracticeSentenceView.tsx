import type { PracticeSentence, SentenceTermCategory } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, TriangleAlert, Volume2 } from "lucide-react";

import { speak } from "./ai-lesson/speak";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMySentencesForPractice } from "@/hooks/useMySentences";
import { usePracticeSentenceVocab } from "@/hooks/usePracticeSentences";

const COMPREHENSION_LABEL = {
  ready: "Ready to card",
  studying: "Studying the parts",
  skip: "Skipped",
} as const;

const TERM_GROUPS: { category: SentenceTermCategory;
  label: string; }[] = [
  {
    category: "vocabulary",
    label: "Vocabulary",
  },
  {
    category: "grammar",
    label: "Grammar",
  },
  {
    category: "general",
    label: "General",
  },
  {
    category: "resource",
    label: "Textbooks & Worksheets",
  },
];

/**
 * Read-only, single-page view of a practice sentence — everything at a glance. Editing happens on the
 * tabbed `/practice/$id/edit` route.
 */
export function PracticeSentenceView({
  practiceSentence: ps,
  sourceName,
}: {
  practiceSentence: PracticeSentence;
  sourceName?: string | null;
}) {
  const {
    data: linkedVocab,
  } = usePracticeSentenceVocab(ps.id);
  const {
    data: mySentences,
  } = useMySentencesForPractice(ps.id);

  const grammar = ps.grammar ?? [];
  const terms = ps.terms ?? [];
  const pageLabel = ps.page ? `p. ${ps.page}` : null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/practice">
            <ArrowLeft className="size-4" />
            All practice sentences
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
        >
          <Link
            to="/practice/$id/edit"
            params={{
              id: ps.id,
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="space-y-5">
        {/* Sentence */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              aria-label="Hear it"
              onClick={() => speak(ps.text)}
            >
              <Volume2 className="size-5" />
            </Button>
            <p className="text-2xl font-semibold">{ps.text}</p>
          </div>
          {ps.reading ? <p className="text-sm text-muted-foreground">{ps.reading}</p> : null}
        </div>

        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{ps.language}</Badge>
          {ps.comprehension
            ? (
              <Badge variant={ps.comprehension === "ready" ? "default" : "outline"}>
                {COMPREHENSION_LABEL[ps.comprehension]}
              </Badge>
            )
            : null}
          {ps.needsCorrection
            ? (
              <Badge
                variant="outline"
                className="gap-1 border-destructive/40 text-destructive"
              >
                <TriangleAlert className="size-3" />
                Needs correction
              </Badge>
            )
            : null}
          {ps.register ? <span>{ps.register}</span> : null}
          {ps.sourceId && sourceName
            ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2"
              >
                <Link
                  to="/sources/$id"
                  params={{
                    id: ps.sourceId,
                  }}
                >{sourceName}
                </Link>
              </Button>
            )
            : null}
          {pageLabel ? <span>{pageLabel}</span> : null}
        </div>

        <Row
          label="Guess"
          value={ps.guess}
        />
        <Row
          label="Target"
          value={ps.target ? `${ps.target}${ps.targetKind ? ` · ${ps.targetKind}` : ""}` : null}
        />
        <Row
          label="Translation"
          value={ps.translation}
        />
        <Row
          label="Literal / structural gloss"
          value={ps.literal}
        />
        <Row
          label="Nuance"
          value={ps.nuance}
        />

        {grammar.length > 0
          ? (
            <div className="space-y-1.5">
              <Label className="text-sm">Grammar</Label>
              <ul className="space-y-0.5 text-sm">
                {grammar.map((g, i) => (
                  <li key={i}>
                    <span className="font-medium">{g.p}</span>
                    {g.n ? ` — ${g.n}` : null}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}

        {/* Tag channels */}
        {TERM_GROUPS.map((grp) => {
          const groupTerms = terms.filter(t => (t.category ?? "vocabulary") === grp.category);
          if (groupTerms.length === 0) return null;
          return (
            <div
              key={grp.category}
              className="space-y-1.5"
            >
              <Label className="text-sm">{`${grp.label} tags`}</Label>
              <div className="flex flex-wrap gap-1.5">
                {groupTerms.map(t => (
                  <Badge
                    key={`${t.sourceId}:${t.id}`}
                    variant="outline"
                  >{t.name}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}

        {linkedVocab && linkedVocab.length > 0
          ? (
            <div className="space-y-1.5">
              <Label className="text-sm">Linked vocab</Label>
              <div className="flex flex-wrap gap-1.5">
                {linkedVocab.map(v => (
                  <Badge
                    key={v.id}
                    variant="secondary"
                    title={v.meaning ?? undefined}
                  >
                    {v.term}
                    {v.reading ? ` (${v.reading})` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )
          : null}

        {mySentences && mySentences.length > 0
          ? (
            <div className="space-y-1.5">
              <Label className="text-sm">My sentence</Label>
              {mySentences.map(ms => (
                <div
                  key={ms.id}
                  className="rounded-md border p-2 text-sm"
                >
                  <p>{ms.text}</p>
                  {ms.correction ? <p className="text-muted-foreground">→ {ms.correction}</p> : null}
                </div>
              ))}
            </div>
          )
          : null}
      </div>
    </section>
  );
}

/** A labelled read-only row, rendered only when there's a value. */
function Row({
  label,
  value,
}: {
  label: string;
  value: string | null;
}): ReactNode {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
