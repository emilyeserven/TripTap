import type { SecretState, UpdateOcrSettingsInput } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOcrSettings, useUpdateOcrSettings } from "@/hooks/useSettings";

/** One labelled API-key input with its stored status and a Clear action (shown when configured). */
function KeyRow({
  id,
  label,
  help,
  state,
  value,
  onChange,
  onClear,
  disabled,
}: {
  id: string;
  label: string;
  help: React.ReactNode;
  state: SecretState | undefined;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const status = state?.configured ? `Saved · ends in ${state.hint}` : "Not set";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          type="password"
          autoComplete="off"
          placeholder={state?.configured ? `••••${state.hint}` : "Paste API key"}
          value={value}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
        />
        {state?.configured
          ? (
            <Button
              type="button"
              variant="outline"
              onClick={onClear}
              disabled={disabled}
            >
              Clear
            </Button>
          )
          : null}
      </div>
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}

/**
 * Settings card for the cloud OCR backends' API keys. Keys are stored server-side (DB) and used for
 * recognition; the API only ever returns a masked hint, so a blank field leaves the stored key
 * unchanged. See {@link ../routes/settings.tsx}.
 */
export function OcrKeysCard() {
  const {
    data, isLoading,
  } = useOcrSettings();
  const update = useUpdateOcrSettings();
  const [ocrSpace, setOcrSpace] = useState("");
  const [googleVision, setGoogleVision] = useState("");
  const [saved, setSaved] = useState(false);

  const busy = update.isPending;
  const nothingToSave = !ocrSpace.trim() && !googleVision.trim();

  function flashSaved() {
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 1500);
  }

  async function save() {
    const input: UpdateOcrSettingsInput = {};
    if (ocrSpace.trim()) input.ocrSpaceApiKey = ocrSpace.trim();
    if (googleVision.trim()) input.googleVisionApiKey = googleVision.trim();
    if (Object.keys(input).length === 0) return;
    await update.mutateAsync(input);
    setOcrSpace("");
    setGoogleVision("");
    flashSaved();
  }

  async function clear(field: keyof UpdateOcrSettingsInput) {
    await update.mutateAsync({
      [field]: "",
    });
    if (field === "ocrSpaceApiKey") setOcrSpace("");
    else setGoogleVision("");
    flashSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloud OCR API keys</CardTitle>
        <CardDescription>
          Credentials for the cloud OCR backends used by
          {" "}
          <Link
            to="/capture"
            className="underline underline-offset-2"
          >Capture
          </Link>
          . Stored on the server and used for recognition — never shown again after saving.
          Leave a field blank to keep its current key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading
          ? <p className="text-sm text-muted-foreground">Loading…</p>
          : (
            <>
              <KeyRow
                id="ocr-space-key"
                label="OCR.space API key"
                state={data?.ocrSpace}
                value={ocrSpace}
                onChange={setOcrSpace}
                onClear={() => void clear("ocrSpaceApiKey")}
                disabled={busy}
                help={(
                  <>
                    Free tier: 25k requests/month, no card. Get one at
                    {" "}
                    <a
                      href="https://ocr.space/ocrapi"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      ocr.space
                    </a>
                    .
                  </>
                )}
              />
              <KeyRow
                id="google-vision-key"
                label="Google Cloud Vision API key"
                state={data?.googleVision}
                value={googleVision}
                onChange={setGoogleVision}
                onClear={() => void clear("googleVisionApiKey")}
                disabled={busy}
                help="A Cloud API key with the Vision API enabled. 1k requests/month free."
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || nothingToSave}
                >
                  {busy
                    ? <Loader2 className="size-4 animate-spin" />
                    : saved
                      ? <Check className="size-4" />
                      : null}
                  {saved ? "Saved" : "Save keys"}
                </Button>
                {update.isError
                  ? <p className="text-sm text-destructive">{update.error.message}</p>
                  : null}
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}
