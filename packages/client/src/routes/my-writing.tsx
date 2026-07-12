import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WritingEditor } from "@/components/WritingEditor";
import { useCreateWriting, useDeleteWriting, useWritings } from "@/hooks/useWritings";

export const Route = createFileRoute("/my-writing")({
  component: MyWritingPage,
});

function MyWritingPage() {
  const {
    data: writings, isLoading, error,
  } = useWritings();
  const createWriting = useCreateWriting();
  const deleteWriting = useDeleteWriting();
  const [search, setSearch] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (writings ?? []).filter((w) => {
      if (onlyReady && !w.readyToReview) return false;
      if (!q) return true;
      return w.text.toLowerCase().includes(q)
        || (w.meaning ?? "").toLowerCase().includes(q)
        || (w.comments ?? "").toLowerCase().includes(q);
    });
  }, [writings, search, onlyReady]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Writing</h1>
          <p className="text-sm text-muted-foreground">
            Write freely in Japanese. Note what you meant, add comments, tag what you were targeting,
            and flag it ready to review. Turn on correction mode to fix a sentence and send it to
            My Sentences.
          </p>
        </div>
        <Button
          onClick={() =>
            createWriting.mutate({
              text: "",
              language: "Japanese",
              readyToReview: false,
            })}
          disabled={createWriting.isPending}
        >
          <PlusIcon className="size-4" />
          New writing
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your writing…"
          aria-label="Search my writing"
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyReady}
            onChange={e => setOnlyReady(e.target.checked)}
          />
          Ready to review only
        </label>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            Nothing yet. Click “New writing” to start.
          </p>
        )
        : null}

      <div className="space-y-6">
        {shown.map(writing => (
          <WritingEditor
            key={writing.id}
            writing={writing}
            onDelete={id => deleteWriting.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}
