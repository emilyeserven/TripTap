import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";

import { CaptureParseWorkspace } from "@/components/CaptureParseWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCapture, useDeleteCapture } from "@/hooks/useCaptures";
import { useSources } from "@/hooks/useSources";
import { capturesApi } from "@/lib/api";

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

  function remove() {
    deleteCapture.mutate(id, {
      onSuccess: () => {
        void navigate({
          to: "/captures",
        });
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
              <h1 className="text-2xl font-bold">
                {capture.title || "Untitled capture"}
              </h1>
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

          <div
            className="
              grid items-start gap-6
              lg:grid-cols-2
            "
          >
            <Card>
              <CardHeader>
                <CardTitle>Source text</CardTitle>
                <CardDescription>{capture.notes || "The full OCR output for this capture."}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre
                  className="
                    max-h-[70vh] overflow-auto font-sans text-sm
                    whitespace-pre-wrap text-foreground
                  "
                >
                  {capture.text}
                </pre>
              </CardContent>
            </Card>

            <CaptureParseWorkspace capture={capture} />
          </div>

          {capture.hasImage && (
            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={capturesApi.imageUrl(capture.id)}
                  alt="Captured page"
                  className="max-h-[70vh] w-auto rounded-md border border-input"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Blocks</CardTitle>
              <CardDescription>
                {capture.blocks.length}
                {" "}
                recognized region(s), preserved for later parsing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4 font-medium">Text</th>
                      <th className="py-1 pr-4 font-medium">Lang</th>
                      <th className="py-1 pr-4 font-medium">Engine</th>
                      <th className="py-1 font-medium">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capture.blocks.map((block, i) => (
                      <tr
                        key={i}
                        className="border-t border-border align-top"
                      >
                        <td className="py-1 pr-4">{block.text}</td>
                        <td className="py-1 pr-4 text-muted-foreground">{block.lang}</td>
                        <td className="py-1 pr-4 text-muted-foreground">{block.engine}</td>
                        <td className="py-1 text-muted-foreground">
                          {Math.round(block.confidence * 100)}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
