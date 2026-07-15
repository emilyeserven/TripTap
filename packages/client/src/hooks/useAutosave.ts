import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved";

/**
 * Debounced autosave for a controlled form. Watches `input` (compared by JSON) and calls `onSave`
 * after `delay` ms of no further changes; the first render (the freshly-loaded value) is skipped so
 * loading a record doesn't trigger a save. Returns a `status` for a small indicator and `flush()` to
 * save immediately (e.g. on a field's blur). Saves are no-ops when nothing changed since the last one.
 */
export function useAutosave<T>(
  input: T,
  onSave: (input: T) => Promise<unknown>,
  delay = 600,
): { status: AutosaveStatus;
  flush: () => void; } {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const inputRef = useRef(input);
  inputRef.current = input;
  const lastSaved = useRef(JSON.stringify(input));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);
  const serialized = JSON.stringify(input);

  const run = useCallback(() => {
    const current = JSON.stringify(inputRef.current);
    if (current === lastSaved.current) return;
    lastSaved.current = current;
    setStatus("saving");
    void Promise.resolve(onSaveRef.current(inputRef.current))
      .then(() => setStatus("saved"))
      .catch(() => setStatus("idle"));
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [serialized, delay, run]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    run();
  }, [run]);

  return {
    status,
    flush,
  };
}
