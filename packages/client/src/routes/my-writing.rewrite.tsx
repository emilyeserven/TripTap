import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { RewriteBlindPanel } from "@/components/RewriteBlindPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWritings } from "@/hooks/useWritings";
import { rewriteReadyWritings } from "@/lib/attention";
import { writingLabel } from "@/lib/writing-label";

export const Route = createFileRoute("/my-writing/rewrite")({
  component: RewriteBlindPage,
});

function RewriteBlindPage() {
  usePageTitle("Rewrite blind");
  const {
    data: writings, isLoading,
  } = useWritings();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Eligible: had corrections and is at least a week old — enough time to have forgotten the fixes.
  // Shared with the attention inbox so the two surfaces can't drift.
  const eligible = useMemo(
    () => rewriteReadyWritings(writings ?? [], new Date()),
    [writings],
  );

  const selected = eligible.find(w => w.id === selectedId) ?? null;

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/my-writing">
          <ArrowLeft className="size-4" />
          All my writing
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        A week after a piece was corrected, write it again from memory and diff it against the fixes.
        Revising beats re-reading, and what breaks a second time is what actually needs a card.
      </p>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && eligible.length === 0
        ? (
          <p className="text-muted-foreground">
            Nothing due yet — corrected writings become available here a week after their corrections.
          </p>
        )
        : null}

      {!selected && eligible.length > 0
        ? (
          <div className="space-y-3">
            {eligible.map(w => (
              <Card key={w.id}>
                <CardContent
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {writingLabel(w)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.date} · {w.corrections?.length ?? 0} corrections
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedId(w.id)}
                  >
                    Rewrite
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
        : null}

      {selected
        ? (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="size-4" />
              Pick another
            </Button>
            <RewriteBlindPanel writing={selected} />
          </div>
        )
        : null}
    </section>
  );
}
