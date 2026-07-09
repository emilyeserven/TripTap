import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { FuriganaScope } from "@/components/lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/lesson/FuriganaToggle";
import { LessonFilterChips } from "@/components/lesson/lesson-filter";
import { uniqueLessons } from "@/components/lesson/lesson-filter-utils";
import { matches, sortLevels } from "@/components/lesson/search";
import { VocabCard } from "@/components/lesson/VocabCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLessonContent, useUpdateVocabRenshuu } from "@/hooks/useLessons";

export const Route = createFileRoute("/vocabulary")({
  component: VocabularyPage,
});

function VocabularyPage() {
  const {
    data, isLoading, error,
  } = useLessonContent();
  const updateVocab = useUpdateVocabRenshuu();

  const items = useMemo(() => data?.vocab ?? [], [data]);
  const lessons = useMemo(() => uniqueLessons(items), [items]);
  const levels = useMemo(() => sortLevels(items.map(v => v.lvl)), [items]);
  const categories = useMemo(() => [...new Set(items.map(v => v.cat))].sort(), [items]);

  const [search, setSearch] = useState("");
  const [lesson, setLesson] = useState("all");
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [renshuu, setRenshuu] = useState("all");

  const filtered = items.filter(v =>
    (lesson === "all" || v.lessonSlug === lesson)
    && (level === "all" || v.lvl === level)
    && (category === "all" || v.cat === category)
    && (renshuu === "all" || (renshuu === "in" ? v.renshuuAdded : !v.renshuuAdded))
    && matches(search, v.jp, v.yomi, v.en));

  return (
    <FuriganaScope>
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Vocabulary</h1>
            <p className="text-sm text-muted-foreground">
              {`${filtered.length} of ${items.length} words.`}
            </p>
          </div>
          <FuriganaToggle />
        </div>

        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search words, readings, meanings…"
          aria-label="Search vocabulary"
        />

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={level}
            onChange={setLevel}
            placeholder="Level"
            allLabel="All levels"
            options={levels}
          />
          <FilterSelect
            value={category}
            onChange={setCategory}
            placeholder="Category"
            allLabel="All categories"
            options={categories}
          />
          <Select
            value={renshuu}
            onValueChange={setRenshuu}
          >
            <SelectTrigger
              className="w-40"
              aria-label="Renshuu status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Renshuu</SelectItem>
              <SelectItem value="in">In Renshuu</SelectItem>
              <SelectItem value="not">Not in Renshuu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <LessonFilterChips
          lessons={lessons}
          value={lesson}
          onChange={setLesson}
        />

        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-destructive">{error.message}</p> : null}
        <div
          className="
            grid gap-3
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {filtered.map(v => (
            <VocabCard
              key={v.id}
              vocab={v}
              lesson={{
                slug: v.lessonSlug,
                title: v.lessonTitle,
              }}
              onRenshuuChange={patch => updateVocab.mutate({
                id: v.id,
                patch,
              })}
            />
          ))}
        </div>
        {!isLoading && filtered.length === 0
          ? <p className="text-muted-foreground">No matching vocabulary.</p>
          : null}
      </section>
    </FuriganaScope>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allLabel: string;
  options: string[];
}) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
    >
      <SelectTrigger
        className="w-40"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(o => (
          <SelectItem
            key={o}
            value={o}
          >{o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
