import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CultureNoteForm } from "@/components/CultureNoteForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/culture/new")({
  component: NewCultureNotePage,
});

function NewCultureNotePage() {
  usePageTitle("New culture note");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/culture">
          <ArrowLeft className="size-4" />
          All culture notes
        </Link>
      </Button>
      <CultureNoteForm
        onSuccess={id =>
          navigate({
            to: "/culture/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
