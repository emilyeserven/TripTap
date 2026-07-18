import { useState } from "react";

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
import { useRenshuuSettings, useUpdateRenshuuSettings } from "@/hooks/useSettings";

/**
 * Settings card for the Renshuu API key. The key is stored server-side (DB, overriding the
 * `RENSHUU_API_KEY` env var) and used to look up example sentences; the API only ever returns a
 * masked hint, so a blank field leaves the stored key unchanged. See {@link ../routes/settings.tsx}.
 */
export function RenshuuKeyCard() {
  const {
    data, isLoading,
  } = useRenshuuSettings();
  const update = useUpdateRenshuuSettings();
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const busy = update.isPending;
  const state = data?.apiKey;
  const status = state?.configured ? `Saved · ends in ${state.hint}` : "Not set";

  function flashSaved() {
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 1500);
  }

  async function save() {
    if (!apiKey.trim()) return;
    await update.mutateAsync({
      apiKey: apiKey.trim(),
    });
    setApiKey("");
    flashSaved();
  }

  async function clear() {
    await update.mutateAsync({
      apiKey: "",
    });
    setApiKey("");
    flashSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renshuu API key</CardTitle>
        <CardDescription>
          Your
          {" "}
          <a
            href="https://www.renshuu.org/index.php?page=misc/apikey"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            renshuu.org
          </a>
          {" "}
          API key, used to find example sentences when adding a sentence from a drill mistake. Stored
          on the server — never shown again after saving. Leave the field blank to keep the current key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading
          ? <p className="text-sm text-muted-foreground">Loading…</p>
          : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="renshuu-key">API key</Label>
                  <span className="text-xs text-muted-foreground">{status}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="renshuu-key"
                    type="password"
                    autoComplete="off"
                    placeholder={state?.configured ? `••••${state.hint}` : "Paste API key"}
                    value={apiKey}
                    onChange={event => setApiKey(event.target.value)}
                    disabled={busy}
                  />
                  {state?.configured
                    ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void clear()}
                        disabled={busy}
                      >
                        Clear
                      </Button>
                    )
                    : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Find it under Account settings → API on renshuu.org.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || !apiKey.trim()}
                >
                  {busy
                    ? <Loader2 className="size-4 animate-spin" />
                    : saved
                      ? <Check className="size-4" />
                      : null}
                  {saved ? "Saved" : "Save key"}
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
