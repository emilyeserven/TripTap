import type { Capture } from "@sentence-bank/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { capturesApi } from "@/lib/api";

/**
 * The Source Reference tab of the capture detail page: the original captured image (when stored)
 * and the raw OCR blocks table, preserved read-only for later parsing.
 */
export function CaptureSourceReference({
  capture,
}: { capture: Capture }) {
  return (
    <>
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
  );
}
