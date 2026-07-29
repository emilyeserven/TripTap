import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { CorrectionTriageFlow } from "@/components/CorrectionTriageFlow";
import { Button } from "@/components/ui/button";
import { useCorrections } from "@/hooks/useCorrections";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/corrections/triage")({
  component: TriagePage,
});

function TriagePage() {
  usePageTitle("Triage corrections");
  const navigate = useNavigate();
  const {
    data: untriaged, isLoading,
  } = useCorrections({
    untriaged: true,
  });

  // Always triage the oldest untriaged correction first; the list re-sorts as each is resolved.
  const queue = untriaged ?? [];
  const current = queue.length > 0 ? queue[queue.length - 1] : null;

  return (
    <section className="max-w-2xl space-y-6">
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

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}

      {!isLoading && current
        ? (
          <>
            <p className="text-sm text-muted-foreground">
              {queue.length} left in the batch
            </p>
            <CorrectionTriageFlow
              key={current.id}
              correction={current}
              onDone={() => {
                // The query invalidates on triage; nothing to do but let the queue shrink.
              }}
            />
          </>
        )
        : null}

      {!isLoading && !current
        ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Inbox clear. Everything’s been triaged.
            </p>
            <Button
              onClick={() =>
                navigate({
                  to: "/corrections/log",
                })}
            >
              See the log
            </Button>
          </div>
        )
        : null}
    </section>
  );
}
