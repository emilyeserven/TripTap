import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ShadowingListForm } from "@/components/ShadowingListForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteShadowingList, useShadowingList } from "@/hooks/useShadowingLists";

export const Route = createFileRoute("/shadowing-lists/$id/edit")({
  component: EditShadowingListPage,
});

function EditShadowingListPage() {
  usePageTitle("Edit shadowing list");
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const deleteList = useDeleteShadowingList();
  const {
    data, isLoading, error,
  } = useShadowingList(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Shadowing list not found.</p>;

  const remove = () => {
    deleteList.mutate(id, {
      onSuccess: () => navigate({
        to: "/shadowing-lists",
      }),
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/shadowing-lists/$id"
            params={{
              id,
            }}
          >
            <ArrowLeft className="size-4" />
            Back to list
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleteList.isPending}
          onClick={remove}
        >
          Delete
        </Button>
      </div>
      <ShadowingListForm
        list={data}
        onSuccess={() =>
          navigate({
            to: "/shadowing-lists/$id",
            params: {
              id,
            },
          })}
      />
    </section>
  );
}
