import { createFileRoute } from "@tanstack/react-router";

import { DailyXpGoalCard } from "@/components/DailyXpGoalCard";
import { LearnerGoalsEditor } from "@/components/LearnerGoalsEditor";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  usePageTitle("Learner Profile");
  return (
    <section className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        What you&apos;re working toward. Goals steer the Start Something page: their learning areas,
        grammar points, and resources get picked first when it suggests a quick task.
      </p>
      <DailyXpGoalCard />
      <LearnerGoalsEditor />
    </section>
  );
}
