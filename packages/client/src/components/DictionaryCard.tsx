import type { DictionaryProvider } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

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
import { useDictionarySettings, useUpdateDictionarySettings } from "@/hooks/useSettings";

/** The provider choices offered in the card. `"default"` clears the stored value (env/default wins). */
type ProviderChoice = DictionaryProvider | "default";

const PROVIDER_OPTIONS: { value: ProviderChoice;
  label: string; }[] = [
  {
    value: "default",
    label: "Server default",
  },
  {
    value: "jisho",
    label: "Jisho",
  },
  {
    value: "jotoba",
    label: "Jotoba",
  },
];

/**
 * Settings card for the Japanese dictionary lookup used by lesson word notes. The user sets the
 * upstream endpoint URL and picks a provider (Jisho or a self-hosted Jotoba); both override the
 * server's env vars, and blank/Server-default falls back to them. All lookups go server-side through the
 * middleware proxy. See {@link ../routes/settings.tsx}.
 */
export function DictionaryCard() {
  const settings = useDictionarySettings();
  const update = useUpdateDictionarySettings();

  const [endpointUrl, setEndpointUrl] = useState("");
  const [provider, setProvider] = useState<ProviderChoice>("default");
  const [saved, setSaved] = useState(false);

  // Seed local state from the loaded settings once (later refetches must not clobber edits).
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !settings.data) return;
    hydrated.current = true;
    setEndpointUrl(settings.data.endpointUrl ?? "");
    setProvider(settings.data.provider ?? "default");
  }, [settings.data]);

  function flashSaved() {
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 1500);
  }

  async function save() {
    await update.mutateAsync({
      endpointUrl: endpointUrl.trim() || null,
      provider: provider === "default" ? null : provider,
    });
    flashSaved();
  }

  const busy = update.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dictionary lookup</CardTitle>
        <CardDescription>
          Backs the “Look up” button on a lesson’s word notes. Point it at
          {" "}
          <a
            href="https://jisho.org"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Jisho
          </a>
          {" "}
          (unofficial API — may be rate-limited) or a self-hosted
          {" "}
          <a
            href="https://jotoba.de"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            Jotoba
          </a>
          {" "}
          instance. All lookups go server-side through the middleware.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {settings.isLoading
          ? <p className="text-sm text-muted-foreground">Loading…</p>
          : (
            <>
              <div className="space-y-2">
                <Label htmlFor="dictionary-endpoint">API endpoint</Label>
                <Input
                  id="dictionary-endpoint"
                  type="url"
                  placeholder="https://jisho.org"
                  value={endpointUrl}
                  onChange={event => setEndpointUrl(event.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Base URL of the dictionary API. Leave blank to use the server default.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <div className="flex flex-wrap gap-2">
                  {PROVIDER_OPTIONS.map(option => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={provider === option.value ? "default" : "outline"}
                      onClick={() => setProvider(option.value)}
                      disabled={busy}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Jisho and Jotoba return different response shapes; the server normalizes both. “Server
                  default” falls back to the DICTIONARY_PROVIDER env var (Jisho if unset).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy}
                >
                  {busy
                    ? <Loader2 className="size-4 animate-spin" />
                    : saved
                      ? <Check className="size-4" />
                      : null}
                  {saved ? "Saved" : "Save"}
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
