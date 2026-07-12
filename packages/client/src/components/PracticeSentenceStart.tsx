import type { CreatePracticeSentenceInput } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { useLessonContent } from "../hooks/useLessons";
import { useCreatePracticeSentence } from "../hooks/usePracticeSentences";
import { useSentences } from "../hooks/useSentences";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

/**
 * Begins a new practice sentence. You either type a sentence, or search the existing sentences — both
 * your bank and the ones mined from lessons — and pick one. Picking copies its text/translation (and,
 * for bank rows, the source/page + a link back). Either way the record is created immediately and you
 * land on its autosaving editor.
 */
export function PracticeSentenceStart() {
  const navigate = useNavigate();
  const create = useCreatePracticeSentence();

  const go = async (input: CreatePracticeSentenceInput) => {
    const created = await create.mutateAsync(input);
    await navigate({
      to: "/practice/$id",
      params: {
        id: created.id,
      },
    });
  };

  return (
    <Tabs defaultValue="type">
      <TabsList>
        <TabsTrigger value="type">Type a sentence</TabsTrigger>
        <TabsTrigger value="search">Search the bank</TabsTrigger>
      </TabsList>
      <TabsContent value="type">
        <TypeTab
          pending={create.isPending}
          onStart={go}
        />
      </TabsContent>
      <TabsContent value="search">
        <SearchTab
          pending={create.isPending}
          onStart={go}
        />
      </TabsContent>
    </Tabs>
  );
}

function TypeTab({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: (input: CreatePracticeSentenceInput) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("Japanese");

  const submit = async () => {
    if (!text.trim()) return;
    await onStart({
      text: text.trim(),
      language: language.trim() || "Japanese",
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className="text-xs tracking-wide text-muted-foreground uppercase">The sentence</Label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="バイトも休めないし、マジで頭が痛い。"
          className="text-lg"
          rows={2}
        />
      </div>
      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label
            className="text-xs tracking-wide text-muted-foreground uppercase"
          >Language
          </Label>
          <Input
            value={language}
            onChange={e => setLanguage(e.target.value)}
            placeholder="Japanese"
          />
        </div>
      </div>
      <Button
        disabled={!text.trim() || pending}
        onClick={() => void submit()}
      >
        {pending ? "Starting…" : "Start editing"}
      </Button>
    </div>
  );
}

/** A searchable candidate drawn from either the sentence bank or a lesson. */
interface Candidate {
  key: string;
  text: string;
  translation: string | null;
  /** Lesson title when mined from a lesson; null for bank sentences. */
  lesson: string | null;
  input: CreatePracticeSentenceInput;
}

function SearchTab({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: (input: CreatePracticeSentenceInput) => Promise<void>;
}) {
  const {
    data: sentences,
  } = useSentences();
  const {
    data: lessonContent,
  } = useLessonContent();
  const [search, setSearch] = useState("");

  const candidates = useMemo<Candidate[]>(() => {
    const bank: Candidate[] = (sentences ?? []).map(s => ({
      key: `bank:${s.id}`,
      text: s.text,
      translation: s.translation,
      lesson: null,
      input: {
        text: s.text,
        language: s.language,
        translation: s.translation,
        sentenceId: s.id,
        sourceId: s.sourceId,
        page: s.page,
      },
    }));
    // Lesson-mined sentences live in a separate table, so they can't populate `sentenceId` (that FK
    // references the bank). Copy their text/translation and map `where` → page instead.
    const lessons: Candidate[] = (lessonContent?.sentences ?? []).map(s => ({
      key: `lesson:${s.lessonSlug}:${s.id}`,
      text: s.jp,
      translation: s.en,
      lesson: s.lessonTitle,
      input: {
        text: s.jp,
        language: "Japanese",
        translation: s.en,
        page: s.where,
      },
    }));
    return [...bank, ...lessons];
  }, [sentences, lessonContent]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q
      ? candidates.filter(c =>
        c.text.toLowerCase().includes(q)
        || (c.translation ?? "").toLowerCase().includes(q)
        || (c.lesson ?? "").toLowerCase().includes(q))
      : candidates;
    return matched.slice(0, 50);
  }, [candidates, search]);

  return (
    <div className="space-y-3 pt-2">
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search your bank and lesson sentences…"
        aria-label="Search sentences"
      />
      <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border p-2">
        {shown.length === 0
          ? <p className="p-2 text-sm text-muted-foreground">No matching sentences.</p>
          : shown.map(c => (
            <button
              key={c.key}
              type="button"
              disabled={pending}
              onClick={() => void onStart(c.input)}
              className="
                block w-full rounded-sm px-2 py-1.5 text-left text-sm
                hover:bg-muted
                disabled:opacity-50
              "
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{c.text}</span>
                {c.lesson
                  ? (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs font-normal"
                    >{c.lesson}
                    </Badge>
                  )
                  : null}
              </span>
              {c.translation
                ? <span className="block text-xs text-muted-foreground">{c.translation}</span>
                : null}
            </button>
          ))}
      </div>
    </div>
  );
}
