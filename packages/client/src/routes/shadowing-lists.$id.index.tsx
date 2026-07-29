import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { ShadowingListView } from "@/components/ShadowingListView";
import { Button } from "@/components/ui/button";
import { useShadowingList } from "@/hooks/useShadowingLists";

export const Route = createFileRoute("/shadowing-lists/$id/")({
  component: ViewShadowingListPage,
});

function ViewShadowingListPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useShadowingList(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Shadowing list not found.</p>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/shadowing-lists">
            <ArrowLeft className="size-4" />
            All shadowing lists
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link
            to="/shadowing-lists/$id/edit"
            params={{
              id,
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <ShadowingListView list={data} />
    </section>
  );
}
