import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CorrectionLogView } from "@/components/CorrectionLogView";
import { Button } from "@/components/ui/button";
import { useCorrectionLog } from "@/hooks/useCorrections";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/corrections/log")({
  component: CorrectionLogPage,
});

function CorrectionLogPage() {
  usePageTitle("Error log");
  const {
    data: log, isLoading, error,
  } = useCorrectionLog();

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/corrections">
          <ArrowLeft className="size-4" />
          Inbox
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Your kept corrections, grouped by rule tag and sorted by frequency. Individually the
          failures look random; grouped, one gap turns out to be behind many of them.
        </p>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {log ? <CorrectionLogView log={log} /> : null}
    </section>
  );
}
