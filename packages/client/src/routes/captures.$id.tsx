import type { Capture } from "@sentence-bank/types";

import { useState } from "react";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";

import { CaptureCreatedItems } from "@/components/CaptureCreatedItems";
import { CaptureParseWorkspace } from "@/components/CaptureParseWorkspace";
import { CleanedBlocksWorkspace } from "@/components/CleanedBlocksWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCapture, useDeleteCapture, useUpdateCapture } from "@/hooks/useCaptures";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSources } from "@/hooks/useSources";
import { capturesApi } from "@/lib/api";

/**
 * Left box of the capture detail page. Edits a persisted, tidied-up copy of the OCR text
 * (`cleanedText`, seeded from the raw `text` when unset) and keeps the pristine source text
 * viewable behind a collapsible toggle.
 */
function CaptureTextCard({
  capture,
}: { capture: Capture }) {
  const [cleaned, setCleaned] = useState(capture.cleanedText ?? capture.text);
  const [saved, setSaved] = useState(false);
  const updateCapture = useUpdateCapture();

  const dirty = cleaned !== (capture.cleanedText ?? capture.text);

  async function save() {
    setSaved(false);
    await updateCapture.mutateAsync({
      id: capture.id,
      // An empty box clears the cleaned copy (falls back to the source text everywhere).
      input: {
        cleanedText: cleaned.trim() ? cleaned : null,
      },
    });
    setSaved(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cleaned text</CardTitle>
        <CardDescription>
          An editable, tidied-up copy of the text. The original OCR output is preserved below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          className="
            max-h-[70vh] w-full rounded-md border border-input bg-transparent
            px-3 py-2 font-sans text-sm whitespace-pre-wrap
            focus:border-blue-500 focus:outline-none
          "
          rows={16}
          value={cleaned}
          onChange={(e) => {
            setCleaned(e.target.value);
            setSaved(false);
          }}
          aria-label="Cleaned text"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={updateCapture.isPending || !dirty}
          >
            {updateCapture.isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCleaned(capture.text);
              setSaved(false);
            }}
          >
            Reset to source
          </Button>
          {saved && !dirty ? <span className="text-sm text-green-700">Saved.</span> : null}
          {updateCapture.isError ? <span className="text-sm text-destructive">Could not save.</span> : null}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Show original source text</summary>
          <pre
            className="
              mt-2 max-h-[50vh] overflow-auto font-sans text-sm
              whitespace-pre-wrap text-foreground
            "
          >
            {capture.text}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

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
              {capture.hasImage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={capturesApi.imageUrl(capture.id)}
                      alt="Captured page"
                      className="
                        max-h-[70vh] w-auto rounded-md border border-input
                      "
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
            </TabsContent>
          </Tabs>
        </>
      )}
    </section>
  );
}
