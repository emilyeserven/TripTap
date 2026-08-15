import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, ListChecks, ScrollText } from "lucide-react";

import { CorrectionCaptureForm } from "@/components/CorrectionCaptureForm";
import { CorrectionImportDialog } from "@/components/CorrectionImportDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCorrections } from "@/hooks/useCorrections";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/corrections/")({
  component: CorrectionsInboxPage,
});

function CorrectionsInboxPage() {
  usePageTitle("Correction Triage");
  const {
    data: untriaged, isLoading,
  } = useCorrections({
    untriaged: true,
  });
  const count = untriaged?.length ?? 0;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Capture corrected output, triage each into one bucket, and keep only what teaches. Reading a
          fix does almost nothing; working through it is where the learning is.
        </p>
        <div className="flex gap-2">
          <CorrectionImportDialog />
          <Button
            asChild
            variant="outline"
          >
            <Link to="/corrections/log">
              <ScrollText className="size-4" />
              Log
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
          >
            <Link to="/corrections/groups">
              <Layers className="size-4" />
              Rule groups
            </Link>
          </Button>
          <Button
            asChild
            disabled={count === 0}
          >
            <Link to="/corrections/triage">
              <ListChecks className="size-4" />
              Triage
              {count > 0
                ? (
                  <Badge
                    variant="secondary"
                    className="ml-1"
                  >
                    {count}
                  </Badge>
                )
                : null}
            </Link>
          </Button>
        </div>
      </div>

      <CorrectionCaptureForm />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Inbox {count > 0 ? `(${count})` : ""}
        </h2>
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
        {!isLoading && count === 0
          ? (
            <p className="text-muted-foreground">
              Nothing waiting. Capture a batch above, then triage it.
            </p>
          )
          : null}
        {(untriaged ?? []).map(correction => (
          <Card key={correction.id}>
            <CardContent className="p-4 text-sm">
              {correction.corrected
                ? (
                  <>
                    <span className="line-through decoration-destructive/60">
                      {correction.original}
                    </span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="font-medium">{correction.corrected}</span>
                  </>
                )
                : <span className="font-medium">{correction.original}</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
