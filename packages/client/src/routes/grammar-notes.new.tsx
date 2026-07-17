import { useEffect } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { GrammarNoteForm } from "@/components/GrammarNoteForm";
import { Button } from "@/components/ui/button";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/grammar-notes/new")({
  component: NewGrammarNotePage,
  validateSearch: (search: Record<string, unknown>): {
    tag?: string;
    name?: string;
  } => ({
    tag: typeof search.tag === "string" ? search.tag : undefined,
    name: typeof search.name === "string" ? search.name : undefined,
  }),
});

function NewGrammarNotePage() {
  usePageTitle("New grammar note");
  const navigate = useNavigate();
  const {
    tag, name,
  } = Route.useSearch();
  const {
    data: notes,
  } = useGrammarNotes();

  // If the preset tag already has a note, send the user to it instead of creating a duplicate.
  const existing = tag ? notes?.find(n => n.tagId === tag) : undefined;
  useEffect(() => {
    if (existing) {
      void navigate({
        to: "/grammar-notes/$id",
        params: {
          id: existing.id,
        },
        replace: true,
      });
    }
  }, [existing, navigate]);

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/grammar-notes">
          <ArrowLeft className="size-4" />
          All grammar notes
        </Link>
      </Button>
      <GrammarNoteForm
        presetTagId={tag}
        presetTagName={name}
        onSuccess={id =>
          navigate({
            to: "/grammar-notes/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
