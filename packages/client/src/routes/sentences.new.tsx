import type { SentenceKind } from "@sentence-bank/types";

import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { MySentenceForm } from "@/components/MySentenceForm";
import { PracticeSentenceStart } from "@/components/PracticeSentenceStart";
import { SentenceForm } from "@/components/SentenceForm";
import { SentenceKindPicker } from "@/components/SentenceKindPicker";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

function parseKind(value: unknown): SentenceKind | undefined {
  return value === "bank" || value === "mine" || value === "practice" ? value : undefined;
}

export const Route = createFileRoute("/sentences/new")({
  component: NewSentencePage,
  validateSearch: (search: Record<string, unknown>): { kind?: SentenceKind } => ({
    kind: parseKind(search.kind),
  }),
});

const BLURBS: Record<SentenceKind, string> = {
  bank: "Add a reference example to your bank — provenance, tags, notes, and linked vocab.",
  mine: "Log a sentence you wrote — its intended meaning, what it actually says, and (optionally) a correction with an explanation.",
  practice: "Type a sentence, or pull one from your bank. It saves as soon as you start — everything after that autosaves.",
};

/** One "new sentence" page for every kind; the picker swaps which form is shown. */
function NewSentencePage() {
  usePageTitle("New sentence");
  const {
    kind: kindParam,
  } = Route.useSearch();
  const [kind, setKind] = useState<SentenceKind>(kindParam ?? "bank");
  const navigate = useNavigate();

  const done = (id: string) => void navigate({
    to: "/sentences/$id",
    params: {
      id,
    },
  });

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link
          to="/sentences"
          search={{
            view: kind,
          }}
        >
          <ArrowLeft className="size-4" />
          All sentences
        </Link>
      </Button>

      <div className="max-w-xs">
        <SentenceKindPicker
          value={kind}
          onChange={setKind}
        />
      </div>

      <p className="text-sm text-muted-foreground">{BLURBS[kind]}</p>

      {kind === "bank"
        ? (
          <SentenceForm
            onSuccess={() => void navigate({
              to: "/sentences",
              search: {
                view: "bank",
              },
            })}
          />
        )
        : null}
      {kind === "mine" ? <MySentenceForm onSuccess={done} /> : null}
      {kind === "practice" ? <PracticeSentenceStart /> : null}
    </section>
  );
}
