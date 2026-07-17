import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";

import { CaptureCreatedItems } from "@/components/CaptureCreatedItems";
import { CaptureParseWorkspace } from "@/components/CaptureParseWorkspace";
import { CaptureSourceReference } from "@/components/CaptureSourceReference";
import { CaptureTextCard } from "@/components/CaptureTextCard";
import { CleanedBlocksWorkspace } from "@/components/CleanedBlocksWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCapture, useDeleteCapture } from "@/hooks/useCaptures";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSources } from "@/hooks/useSources";

export const Route = createFileRoute("/captures/$id")({
  component: CaptureDetailPage,
});

function CaptureDetailPage() {
  const {
    id,
  } = Route.useParams();
  const navigate = useNavigate();
  const {
    data: capture, isLoading, error,
  } = useCapture(id);
  const {
    data: sources,
  } = useSources();
  const deleteCapture = useDeleteCapture();

  const sourceName = capture?.sourceId
    ? sources?.find(s => s.id === capture.sourceId)?.name ?? null
    : null;

  usePageTitle(capture ? (capture.title || "Untitled capture") : "");

  function remove() {
    if (!globalThis.confirm("Delete this capture? Sentences and vocab created from it are kept.")) {
      return;
    }
    deleteCapture.mutate(id, {
      onSuccess: () => {
        void navigate({
          to: "/captures",
        });
      },
      onError: (err) => {
        globalThis.alert(err instanceof Error ? err.message : "Could not delete capture");
      },
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/captures"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          Captures
        </Link>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}

      {capture && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div
                className="
                  flex flex-wrap items-center gap-2 text-sm
                  text-muted-foreground
                "
              >
                <Badge variant={capture.status === "parsed" ? "secondary" : "outline"}>
                  {capture.status}
                </Badge>
                {[sourceName, capture.page ? `p. ${capture.page}` : null]
                  .filter(Boolean)
                  .map(part => <span key={part}>{part}</span>)}
                {capture.engines.map(engine => (
                  <Badge
                    key={engine}
                    variant="secondary"
                  >
                    {engine}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={remove}
              disabled={deleteCapture.isPending}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>

          <Tabs
            defaultValue="created"
            className="w-full"
          >
            <TabsList className="flex-wrap">
              <TabsTrigger value="created">Created From Capture</TabsTrigger>
              <TabsTrigger value="block">Block Mode</TabsTrigger>
              <TabsTrigger value="text">Text Mode</TabsTrigger>
              <TabsTrigger value="source">Source Reference</TabsTrigger>
            </TabsList>

            {/* 1. Created From Capture */}
            <TabsContent value="created">
              <CaptureCreatedItems captureId={capture.id} />
            </TabsContent>

            {/* 2. Block Mode — cleaned blocks editor + resulting items (side-by-side on wide screens) */}
            <TabsContent value="block">
              <CleanedBlocksWorkspace capture={capture} />
            </TabsContent>

            {/* 3. Text Mode — cleaned text + create-from-text + preview */}
            <TabsContent value="text">
              <div
                className="
                  grid items-start gap-6
                  lg:grid-cols-2
                "
              >
                <CaptureTextCard capture={capture} />

                <CaptureParseWorkspace capture={capture} />
              </div>
            </TabsContent>

            {/* 4. Source Reference — original image + raw OCR blocks */}
            <TabsContent
              value="source"
              className="space-y-6"
            >
              <CaptureSourceReference capture={capture} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  );
}
