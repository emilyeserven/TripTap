import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { TutorForm } from "@/components/TutorForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/tutors/new")({
  component: NewTutorPage,
});

function NewTutorPage() {
  usePageTitle("New tutor");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/tutors">
          <ArrowLeft className="size-4" />
          All tutors
        </Link>
      </Button>
      <TutorForm
        onSuccess={id =>
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
