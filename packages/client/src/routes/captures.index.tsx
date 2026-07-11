import { useState } from "react";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ImageOff, PencilLine } from "lucide-react";

import { ManualCaptureForm } from "@/components/ManualCaptureForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCaptures } from "@/hooks/useCaptures";
import { useSources } from "@/hooks/useSources";
import { capturesApi } from "@/lib/api";

export const Route = createFileRoute("/captures/")({
  component: CapturesPage,
});

function CapturesPage() {
  const navigate = useNavigate();
  const {
    data: captures, isLoading, error,
  } = useCaptures();
  const {
    data: sources,
  } = useSources();
  const [manualOpen, setManualOpen] = useState(false);

  const sourceName = (id: string | null) =>
    (id ? sources?.find(s => s.id === id)?.name ?? null : null);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Captures</h1>
          <p className="text-sm text-muted-foreground">
            Saved OCR scans, ready to parse into sentences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setManualOpen(true)}
          >
            <PencilLine className="size-4" />
            Add manually
          </Button>
          <Button asChild>
            <Link to="/sentences/capture">
              <Camera className="size-4" />
              Scan
            </Link>
          </Button>
        </div>
      </div>

      <Dialog
        open={manualOpen}
        onOpenChange={setManualOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New capture</DialogTitle>
          </DialogHeader>
          {manualOpen && (
            <ManualCaptureForm
              onSaved={(id) => {
                setManualOpen(false);
                void navigate({
                  to: "/captures/$id",
                  params: {
                    id,
                  },
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && captures && captures.length === 0
        ? <p className="text-muted-foreground">No captures yet. Scan a page to get started.</p>
        : null}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        {(captures ?? []).map(capture => (
          <Link
            key={capture.id}
            to="/captures/$id"
            params={{
              id: capture.id,
            }}
            className="block"
          >
            <Card
              className="
                h-full transition-colors
                hover:border-ring
              "
            >
              <CardContent className="flex gap-3 p-4">
                <div
                  className="
                    flex size-20 shrink-0 items-center justify-center
                    overflow-hidden rounded-md border border-input bg-muted
                  "
                >
                  {capture.hasImage
                    ? (
                      <img
                        src={capturesApi.imageUrl(capture.id)}
                        alt=""
                        className="size-full object-cover"
                      />
                    )
                    : <ImageOff className="size-6 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {capture.title || capture.text.slice(0, 40) || "Untitled capture"}
                    </p>
                    <Badge variant={capture.status === "parsed" ? "secondary" : "outline"}>
                      {capture.status}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{capture.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {[sourceName(capture.sourceId), capture.page ? `p. ${capture.page}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
