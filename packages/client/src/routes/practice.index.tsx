import type { StudyLevel } from "@/stores/uiStore";
import type { PracticeComprehension } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PracticeSentenceCard } from "@/components/PracticeSentenceCard";
import { PracticeSentenceImportDialog } from "@/components/PracticeSentenceImportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeletePracticeSentence, usePracticeSentences } from "@/hooks/usePracticeSentences";
import { useSources } from "@/hooks/useSources";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/practice/")({
  component: PracticePage,
});

/** Tofugu's suggested daily add-rate by level. */
const ADD_RATE: Record<StudyLevel, number> = {
  beginner: 1,
  intermediate: 3,
  advanced: 5,
};

const COMPREHENSION_FILTERS: { value: "all" | PracticeComprehension;
  label: string; }[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "ready",
    label: "Ready to card",
  },
  {
    value: "studying",
    label: "Studying",
  },
  {
    value: "skip",
    label: "Skipped",
  },
];

function matchesSearch(query: string, ...fields: (string | null)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some(f => (f ?? "").toLowerCase().includes(q));
}

function PracticePage() {
  const {
    data: practiceSentences, isLoading, error,
  } = usePracticeSentences();
  const deletePracticeSentence = useDeletePracticeSentence();
  const {
    data: sources,
  } = useSources();
  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);
  const showTranslations = useUiStore(s => s.showTranslations);
  const toggleShowTranslations = useUiStore(s => s.toggleShowTranslations);
  const studyLevel = useUiStore(s => s.studyLevel);
  const setStudyLevel = useUiStore(s => s.setStudyLevel);

  const [search, setSearch] = useState("");
  const [comprehensionFilter, setComprehensionFilter] = useState<"all" | PracticeComprehension>("all");

  const all = practiceSentences ?? [];

  // How many practice sentences were added today (local date), for the add-rate guidance.
  const today = new Date().toDateString();
  const addedToday = all.filter(ps => new Date(ps.createdAt).toDateString() === today).length;
  const cap = ADD_RATE[studyLevel];

  const shown = useMemo(
    () =>
      all.filter(ps =>
        (comprehensionFilter === "all" || ps.comprehension === comprehensionFilter)
        && matchesSearch(search, ps.text, ps.translation, ps.target, ps.reading)),
    [all, search, comprehensionFilter],
  );

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Study Sentences</h1>
          <p className="text-sm text-muted-foreground">
            Richly break a sentence down, keep one target, then throw most of it away. A study aid —
            these aren&apos;t professionally written, so they may need corrections.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <input
              type="checkbox"
              checked={showTranslations}
              onChange={toggleShowTranslations}
            />
            Show translations
          </label>
          <PracticeSentenceImportDialog />
          <Button asChild>
            <Link to="/practice/new">
              <Plus className="size-4" />
              New practice sentence
            </Link>
          </Button>
        </div>
      </div>

      {/* Add-rate guidance (Tofugu: pace beginner 1 / intermediate 3 / advanced 5 per day). */}
      <div
        className={`
          flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm
          ${addedToday > cap
      ? "border-destructive/40 text-destructive"
      : "text-muted-foreground"}
        `}
      >
        <span>
          Added
          {" "}
          <strong>{addedToday}</strong>
          {" "}
          today. Tofugu suggests ≤
          {cap}
          {" "}
          for
        </span>
        <Select
          value={studyLevel}
          onValueChange={v => setStudyLevel(v as StudyLevel)}
        >
          <SelectTrigger
            size="sm"
            className="w-36"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">beginner (1/day)</SelectItem>
            <SelectItem value="intermediate">intermediate (3/day)</SelectItem>
            <SelectItem value="advanced">advanced (5/day)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search practice sentences…"
          aria-label="Search practice sentences"
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-1">
          {COMPREHENSION_FILTERS.map(f => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={comprehensionFilter === f.value ? "default" : "outline"}
              onClick={() => setComprehensionFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No matching practice sentences. Add one, or import from a capture or your bank sentences.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(ps => (
          <PracticeSentenceCard
            key={ps.id}
            practiceSentence={ps}
            showTranslation={showTranslations}
            sourceName={sourceName(ps.sourceId)}
            onDelete={id => deletePracticeSentence.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}
