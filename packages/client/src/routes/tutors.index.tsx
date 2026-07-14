import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { TutorCard } from "@/components/TutorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteTutor, useTutors } from "@/hooks/useTutors";

export const Route = createFileRoute("/tutors/")({
  component: TutorsPage,
});

function TutorsPage() {
  usePageTitle("Tutors");
  const {
    data: tutors, isLoading, error,
  } = useTutors();
  const deleteTutor = useDeleteTutor();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tutors ?? []).filter((t) => {
      if (!q) return true;
      return t.name.toLowerCase().includes(q);
    });
  }, [tutors, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            The tutors you take lessons with. Open one to review it, or filter lessons by tutor from
            the Lessons page.
          </p>
        </div>
        <Button asChild>
          <Link to="/tutors/new">
            <Plus className="size-4" />
            New tutor
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search tutors…"
        aria-label="Search tutors"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No tutors yet. Create one with “New tutor”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(tutor => (
          <TutorCard
            key={tutor.id}
            tutor={tutor}
            onDelete={id => deleteTutor.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}
