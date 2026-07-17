import type { WritingPromptDifficulty } from "@sentence-bank/types";

import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WritingPromptFields } from "@/components/WritingPromptFields";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useDeleteWritingPrompt,
  useUpdateWritingPrompt,
  useWritingPrompt,
} from "@/hooks/useWritingPrompts";

export const Route = createFileRoute("/writing-prompts/$id")({
  component: EditWritingPromptPage,
});

function EditWritingPromptPage() {
  usePageTitle("Edit prompt");
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useWritingPrompt(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Prompt not found.</p>;

  return (
    <EditWritingPromptForm
      key={data.id}
      prompt={data}
    />
  );
}

function EditWritingPromptForm({
  prompt,
}: {
  prompt: {
    id: string;
    title: string | null;
    titleEn: string | null;
    text: string;
    textEn: string | null;
    difficulty: WritingPromptDifficulty;
  };
}) {
  const navigate = useNavigate();
  const updatePrompt = useUpdateWritingPrompt();
  const deletePrompt = useDeleteWritingPrompt();

  const [title, setTitle] = useState(prompt.title ?? "");
  const [titleEn, setTitleEn] = useState(prompt.titleEn ?? "");
  const [text, setText] = useState(prompt.text);
  const [textEn, setTextEn] = useState(prompt.textEn ?? "");
  const [difficulty, setDifficulty] = useState<WritingPromptDifficulty>(prompt.difficulty);

  const toList = () => navigate({
    to: "/writing-prompts",
  });

  const save = () => {
    const nextText = text.trim();
    if (!nextText) return;
    updatePrompt.mutate(
      {
        id: prompt.id,
        input: {
          title: title.trim() || null,
          titleEn: titleEn.trim() || null,
          text: nextText,
          textEn: textEn.trim() || null,
          difficulty,
        },
      },
      {
        onSuccess: toList,
      },
    );
  };

  const remove = () => {
    deletePrompt.mutate(prompt.id, {
      onSuccess: toList,
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/writing-prompts">
          <ArrowLeft className="size-4" />
          Back to prompts
        </Link>
      </Button>

      <div>
        <p className="text-sm text-muted-foreground">
          Update the titles, the Japanese and English versions, or the difficulty tag.
        </p>
      </div>

      <WritingPromptFields
        title={title}
        titleEn={titleEn}
        text={text}
        textEn={textEn}
        difficulty={difficulty}
        onTitleChange={setTitle}
        onTitleEnChange={setTitleEn}
        onTextChange={setText}
        onTextEnChange={setTextEn}
        onDifficultyChange={setDifficulty}
      />

      <div className="flex items-center justify-between gap-2">
        <Button
          onClick={save}
          disabled={!text.trim() || updatePrompt.isPending}
        >
          Save
        </Button>
        <Button
          variant="destructive"
          onClick={remove}
          disabled={deletePrompt.isPending}
        >
          Delete
        </Button>
      </div>
    </section>
  );
}
