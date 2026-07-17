import type { MediaConnectionChecks } from "@sentence-bank/types";

import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMediaSettings, useTestMediaConnection } from "@/hooks/useSettings";

const CHECK_LABELS: { key: keyof MediaConnectionChecks;
  label: string; }[] = [
  {
    key: "list",
    label: "List bucket",
  },
  {
    key: "write",
    label: "Upload object",
  },
  {
    key: "read",
    label: "Read object back",
  },
  {
    key: "delete",
    label: "Delete object",
  },
];

/** A single "label: value" status line. */
function StatusRow({
  label, value,
}: { label: string;
  value: string; }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs break-all">{value}</span>
    </div>
  );
}

/**
 * Settings card for the media object store (S3/Garage) that holds imported Migaku audio/images. Shows
 * the (non-secret) configured endpoint/bucket from env and runs a live connectivity round-trip.
 */
export function MediaStorageCard() {
  const {
    data: status, isLoading,
  } = useMediaSettings();
  const test = useTestMediaConnection();
  const result = test.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media storage (Garage / S3)</CardTitle>
        <CardDescription>
          Object storage for audio and images imported from Migaku decks. Configured via the
          {" "}
          <code>S3_*</code>
          {" "}
          environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading
          ? <p className="text-muted-foreground">Loading…</p>
          : (
            <div className="space-y-1">
              <StatusRow
                label="Status"
                value={status?.configured ? "Configured" : "Not configured"}
              />
              {status?.configured
                ? (
                  <>
                    <StatusRow
                      label="Endpoint"
                      value={status.endpoint ?? "—"}
                    />
                    <StatusRow
                      label="Bucket"
                      value={status.bucket ?? "—"}
                    />
                    <StatusRow
                      label="Region"
                      value={status.region ?? "—"}
                    />
                  </>
                )
                : (
                  <p className="text-muted-foreground">
                    Set
                    {" "}
                    <code>S3_ENDPOINT</code>
                    ,
                    {" "}
                    <code>S3_BUCKET</code>
                    ,
                    {" "}
                    <code>S3_ACCESS_KEY_ID</code>
                    , and
                    {" "}
                    <code>S3_SECRET_ACCESS_KEY</code>
                    , then redeploy.
                  </p>
                )}
            </div>
          )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={test.isPending || !status?.configured}
            onClick={() => test.mutate()}
          >
            {test.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Test connection
          </Button>
          {result
            ? (
              <span
                className={result.ok
                  ? `
                    text-sm text-green-600
                    dark:text-green-500
                  `
                  : "text-sm text-destructive"}
              >
                {result.ok ? "Connected — read/write/delete OK" : "Connection failed"}
              </span>
            )
            : null}
        </div>

        {result
          ? (
            <div className="space-y-1 rounded-md border p-3">
              {CHECK_LABELS.map(({
                key, label,
              }) => (
                <div
                  key={key}
                  className="flex items-center gap-2"
                >
                  {result.checks[key]
                    ? (
                      <Check
                        className="
                          size-4 text-green-600
                          dark:text-green-500
                        "
                      />
                    )
                    : <X className="size-4 text-destructive" />}
                  <span>{label}</span>
                </div>
              ))}
              {result.error
                ? <p className="pt-1 text-xs wrap-break-word text-destructive">{result.error}</p>
                : null}
            </div>
          )
          : null}
      </CardContent>
    </Card>
  );
}
