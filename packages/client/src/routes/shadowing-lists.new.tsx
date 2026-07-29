import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ShadowingListForm } from "@/components/ShadowingListForm";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/shadowing-lists/new")({
  component: NewShadowingListPage,
});

function NewShadowingListPage() {
  usePageTitle("New shadowing list");
  const navigate = useNavigate();

  return (
    <section className="max-w-3xl space-y-6">
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
      <ShadowingListForm
        onSuccess={id =>
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
