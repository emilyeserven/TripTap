import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ActivityLogCard } from "@/components/ActivityLogCard";
import { DailyXpGoalCard } from "@/components/DailyXpGoalCard";
import { LearnerGoalsEditor } from "@/components/LearnerGoalsEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: search.tab === "activity" ? "activity" : "goals",
  }),
});

function ProfilePage() {
  usePageTitle("Learner Profile");
  const navigate = useNavigate();
  const {
    tab,
  } = Route.useSearch();
  return (
    <section className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        What you&apos;re working toward, and what you&apos;ve been doing. Goals steer the Start
        Something page; the activity log shows the XP you&apos;ve earned day by day.
      </p>
      <Tabs
        value={tab}
        onValueChange={next => void navigate({
          to: "/profile",
          search: {
            tab: next,
          },
        })}
      >
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent
          value="goals"
          className="space-y-6"
        >
          <DailyXpGoalCard />
          <LearnerGoalsEditor />
        </TabsContent>
        <TabsContent
          value="activity"
          className="space-y-6"
        >
          <ActivityLogCard />
        </TabsContent>
      </Tabs>
    </section>
  );
}
