import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { MigakuCandidateTable } from "@/components/MigakuCandidateTable";
import { Button } from "@/components/ui/button";
import { useMigakuImport } from "@/hooks/useMigakuImports";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/migaku-import/$id")({
  component: MigakuImportReviewPage,
});

function MigakuImportReviewPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data: detail, isLoading, error,
  } = useMigakuImport(id);
  usePageTitle(detail ? `Review ${detail.filename}` : "Review import");

  return (
    <section className="space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2"
      >
        <Link to="/migaku-import">
          <ArrowLeft className="size-4" />
          Back to imports
        </Link>
      </Button>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {detail && detail.status !== "parsed"
        ? <p className="text-muted-foreground">This import has already been committed.</p>
        : null}
      {detail && detail.status === "parsed"
        ? <MigakuCandidateTable detail={detail} />
        : null}
    </section>
  );
}
