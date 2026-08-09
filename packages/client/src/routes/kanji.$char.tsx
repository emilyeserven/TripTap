import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { KanjiDetailView } from "@/components/KanjiDetailView";
import { Button } from "@/components/ui/button";
import { useKanji } from "@/hooks/useKanji";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/kanji/$char")({
  component: KanjiDetailPage,
});

function KanjiDetailPage() {
  const {
    char,
  } = Route.useParams();
  usePageTitle(char);
  const {
    data: detail, isLoading, error,
  } = useKanji(char);

  return (
    <section className="space-y-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/kanji">
          <ChevronLeft className="size-4" />
          All kanji
        </Link>
      </Button>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {detail ? <KanjiDetailView detail={detail} /> : null}
    </section>
  );
}
