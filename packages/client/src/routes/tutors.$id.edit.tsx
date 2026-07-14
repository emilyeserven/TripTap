import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { TutorForm } from "@/components/TutorForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTutor } from "@/hooks/useTutors";

export const Route = createFileRoute("/tutors/$id/edit")({
  component: EditTutorPage,
});

function EditTutorPage() {
  usePageTitle("Edit tutor");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data, isLoading, error,
  } = useTutor(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Tutor not found.</p>;

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link
          to="/tutors/$id"
          params={{
            id,
          }}
        >
          <ArrowLeft className="size-4" />
          Back to tutor
        </Link>
      </Button>
      <TutorForm
        tutor={data}
        onSuccess={() =>
          navigate({
            to: "/tutors/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
