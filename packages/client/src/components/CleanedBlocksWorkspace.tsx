import type {
  Capture,
  CleanedBlocks,
  CleanedGroupKind,
  CleanedLineRole,
} from "@sentence-bank/types";

import { useEffect, useMemo, useState } from "react";

import { SharedCaptureFields } from "./SharedCaptureFields";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateCapture } from "@/hooks/useCaptures";
import { useCreateSentencesMany } from "@/hooks/useSentences";
import { useCreateVocabMany, useVocab } from "@/hooks/useVocab";
import {
  deleteLine,
  deleteLines,
  deriveItems,
  hasScriptBoundary,
  LANG_NAMES,
  linkGroups,
  moveItem,
  seedCleanedBlocks,
  setGroupKind,
  setKindForLines,
  setLinesRole,
  splitLineAt,
  splitLineByScript,
  stitchLines,
  toggleIgnoredLang,
  unlinkGroups,
  unstitchLines,
  updateLineLang,
  updateLineRole,
  updateLineText,
} from "@/lib/cleanedBlocks";

const inlineClass
  = "rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none";

const ROLES: { value: CleanedLineRole;
  label: string; }[] = [
  {
    value: "text",
    label: "Text",
  },
  {
    value: "translation",
    label: "Translation",
  },
  {
    value: "furigana",
    label: "Furigana",
  },
  {
    value: "structure",
    label: "Structure",
  },
  {
    value: "ignore",
    label: "Ignore",
  },
];

/** Left-border tints cycled per group so grouped lines read as one unit. */
const GROUP_TINTS = [
  "border-l-blue-400",
  "border-l-emerald-400",
  "border-l-amber-400",
  "border-l-violet-400",
  "border-l-rose-400",
  "border-l-cyan-400",
];

/**
 * Alternative to {@link CaptureParseWorkspace}: an editable, per-line view of the OCR blocks. The
 * user fixes text, sets each line's language, groups continuation/translation/furigana lines
 * together, marks page furniture as "structure", and bulk-ignores whole languages — then each group
 * becomes one sentence or vocab entry. The grouping is persisted on the capture so associations
 * survive reloads; a live preview card drives creation into the bank.
 */
export function CleanedBlocksWorkspace({
  capture,
}: { capture: Capture }) {
  // A stable seed (computed once) is the fallback baseline before the column is first saved; using
  // it for both the initial draft and the dirty comparison keeps line/group ids consistent.
  const [seeded] = useState(() => seedCleanedBlocks(capture));
  const [draft, setDraft] = useState<CleanedBlocks>(capture.cleanedBlocks ?? seeded);

  // Shared (batch) values applied to every derived item.
  const [sourceId, setSourceId] = useState<string | null>(capture.sourceId);
  const [page, setPage] = useState(capture.page ?? "");
  const [language, setLanguage] = useState("Japanese");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);

  // Transient multi-select (not persisted). `anchorIndex` drives Shift-range selection.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  // Caret position in the focused line's text input, driving the "split at cursor" control.
  const [caret, setCaret] = useState<{ id: string;
    index: number; } | null>(null);

  const {
    data: vocab,
  } = useVocab();
  const updateCapture = useUpdateCapture();
  const createSentences = useCreateSentencesMany();
  const createVocab = useCreateVocabMany();

  const baseline = capture.cleanedBlocks ?? seeded;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  const preview = useMemo(() => {
    const suggestLinks = (text: string) =>
      (vocab ?? []).filter(v => v.term && text.includes(v.term)).map(v => v.id);
    return deriveItems(draft, {
      captureId: capture.id,
      sourceId,
      page,
      tags,
      notes,
      batchLanguage: language,
      suggestLinks,
    });
  }, [draft, sourceId, page, tags, notes, language, vocab, capture.id]);

  const vocabName = (id: string) => vocab?.find(v => v.id === id)?.term ?? id;

  // Item (linked-stitch) ordering + which line opens each item (for the kind/move controls) + tint.
  // An "item" key is a stitch's link, or its own id when unlinked — matching how deriveItems bundles.
  const {
    itemTint, firstLineOfItem, presentLangs, itemOrder, linkedGroupIds,
  } = useMemo(() => {
    const linkOf = new Map(draft.groups.map(g => [g.id, g.link]));
    const keyOf = (line: (typeof draft.lines)[number]) => linkOf.get(line.group) ?? line.group;
    const order: string[] = [];
    const first = new Map<string, string>();
    const langs = new Set<string>();
    const linked = new Set<string>();
    for (const line of draft.lines) {
      langs.add(line.lang);
      if ((linkOf.get(line.group) ?? null) !== null) linked.add(line.group);
      const key = keyOf(line);
      if (!first.has(key)) {
        first.set(key, line.id);
        order.push(key);
      }
    }
    const tint = new Map(order.map((id, i) => [id, GROUP_TINTS[i % GROUP_TINTS.length]]));
    return {
      itemTint: tint,
      firstLineOfItem: first,
      presentLangs: [...langs].sort(),
      itemOrder: order,
      linkedGroupIds: linked,
    };
  }, [draft.lines, draft.groups]);

  const kindOf = new Map<string, CleanedGroupKind>(draft.groups.map(g => [g.id, g.kind]));
  const linkOf = new Map<string, string | null>(draft.groups.map(g => [g.id, g.link]));
  const ignored = new Set(draft.ignoredLangs);

  // Language options: the standard set plus any code actually present on a line.
  const langOptions = [...new Set([...Object.keys(LANG_NAMES), ...presentLangs])].sort();

  // --- Selection + bulk actions ---
  function toggleSelect(index: number, shift: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && anchorIndex !== null) {
        const [lo, hi] = anchorIndex <= index ? [anchorIndex, index] : [index, anchorIndex];
        for (let i = lo; i <= hi; i += 1) next.add(draft.lines[i].id);
      }
      else {
        const id = draft.lines[index].id;
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    if (!shift) setAnchorIndex(index);
  }

  function clearSelection() {
    setSelected(new Set());
    setAnchorIndex(null);
  }

  // Escape deselects everything.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Functional update reads the latest set without re-subscribing; no-op when already empty.
      setSelected(prev => (prev.size === 0 ? prev : new Set()));
      setAnchorIndex(null);
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedIds = () => [...selected];

  function bulkRole(role: CleanedLineRole) {
    setDraft(d => setLinesRole(d, selectedIds(), role));
  }

  function bulkKind(kind: CleanedGroupKind) {
    setDraft(d => setKindForLines(d, selectedIds(), kind));
  }

  function bulkDelete() {
    const ids = selectedIds();
    setDraft(d => deleteLines(d, ids));
    clearSelection();
  }

  /** Remove a single line and drop it from the selection. */
  function removeLine(id: string) {
    setDraft(d => deleteLine(d, id));
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  /** Unlink an item: clear the link on every stitch that shares this stitch's link. */
  function unlinkItem(groupId: string) {
    const link = linkOf.get(groupId);
    const ids = draft.lines
      .filter(l => (link != null ? linkOf.get(l.group) === link : l.group === groupId))
      .map(l => l.id);
    setDraft(d => unlinkGroups(d, ids));
  }

  async function save() {
    setDone(null);
    await updateCapture.mutateAsync({
      id: capture.id,
      input: {
        cleanedBlocks: draft,
      },
    });
  }

  async function create() {
    setDone(null);
    // Persist the grouping first so what was created matches what is saved.
    if (dirty) {
      await updateCapture.mutateAsync({
        id: capture.id,
        input: {
          cleanedBlocks: draft,
        },
      });
    }
    const parts: string[] = [];
    if (preview.sentences.length > 0) {
      await createSentences.mutateAsync(preview.sentences);
      parts.push(`${preview.sentences.length} sentence(s)`);
    }
    if (preview.vocab.length > 0) {
      await createVocab.mutateAsync(preview.vocab);
      parts.push(`${preview.vocab.length} vocab item(s)`);
    }
    if (parts.length === 0) return;
    setDone(`Created ${parts.join(" and ")}.`);
    if (capture.status !== "parsed") {
      await updateCapture.mutateAsync({
        id: capture.id,
        input: {
          status: "parsed",
        },
      });
    }
  }

  const busy = createSentences.isPending || createVocab.isPending;
  const totalValid = preview.sentences.length + preview.vocab.length;

  return (
    <div
      className="
        grid items-start gap-4
        xl:grid-cols-2
      "
    >
      <Card>
        <CardHeader>
          <CardTitle>Cleaned blocks</CardTitle>
          <CardDescription>
            Fix each line and set its language. Select rows (Shift-click for a range), then
            {" "}
            <strong>Stitch</strong>
            {" "}
            OCR-split continuation lines into one text, or
            {" "}
            <strong>Link</strong>
            {" "}
            a text block to its translation so they combine into one item. Split a block that mixes
            languages with
            {" "}
            <strong>あ/A</strong>
            {" "}
            (by script) or
            {" "}
            <strong>✂</strong>
            {" "}
            (at the cursor). Switch items to
            {" "}
            <strong>Vocab</strong>
            , mark page furniture as “Structure”, set junk lines to “Ignore”, or ignore a whole
            language to leave it out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language filter bar */}
          {presentLangs.length > 0
            ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Ignore language:</span>
                {presentLangs.map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setDraft(d => toggleIgnoredLang(d, code))}
                    className={`
                      rounded-full border px-2 py-0.5 text-xs
                      ${
                  ignored.has(code)
                    ? `
                      border-destructive bg-red-50 text-destructive line-through
                    `
                    : `
                      border-slate-300 text-slate-600
                      hover:border-blue-400
                    `
                  }
                    `}
                    title={ignored.has(code) ? "Include again" : "Exclude these lines"}
                  >
                    {code}
                    {" "}
                    (
                    {LANG_NAMES[code] ?? "?"}
                    )
                  </button>
                ))}
              </div>
            )
            : null}

          {/* Bulk action bar — always occupies its space; visibility toggles so rows never shift. */}
          <div
            className={`
              sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-md
              border border-blue-300 bg-blue-50 p-2 text-sm
              ${selected.size > 0 ? "visible" : "invisible"}
            `}
            aria-hidden={selected.size === 0}
          >
            <span className="font-medium text-blue-900">
              {selected.size}
              {" "}
              selected
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraft(d => stitchLines(d, selectedIds()))}
              title="Stitch continuation lines into one text"
            >
              Stitch
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraft(d => unstitchLines(d, selectedIds()))}
              title="Split each selected line into its own stitch"
            >
              Unstitch
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraft(d => linkGroups(d, selectedIds()))}
              title="Link a text block to its translation (they derive as one item)"
            >
              Link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraft(d => unlinkGroups(d, selectedIds()))}
              title="Unlink the selected items"
            >
              Unlink
            </Button>
            <select
              className={inlineClass}
              value=""
              onChange={(e) => {
                if (e.target.value) bulkRole(e.target.value as CleanedLineRole);
              }}
              aria-label="Set role for selected lines"
            >
              <option value="">Set role…</option>
              {ROLES.map(r => (
                <option
                  key={r.value}
                  value={r.value}
                >
                  {r.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => bulkKind("vocab")}
              title="Make the selected items vocab"
            >
              → Vocab
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => bulkKind("sentence")}
              title="Make the selected items sentences"
            >
              → Sentence
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={bulkDelete}
            >
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearSelection}
            >
              Clear
            </Button>
          </div>

          {/* Line editor */}
          <div className="space-y-1.5">
            {draft.lines.map((line, i) => {
              const itemKey = linkOf.get(line.group) ?? line.group;
              const opensItem = firstLineOfItem.get(itemKey) === line.id;
              const dimmed = line.role === "structure" || line.role === "ignore" || ignored.has(line.lang);
              const itemIdx = itemOrder.indexOf(itemKey);
              const isLinked = linkedGroupIds.has(line.group);
              return (
                <div
                  key={line.id}
                  className={`
                    flex flex-wrap items-center gap-1.5 rounded-md border
                    border-l-4 border-input bg-card p-1.5
                    ${itemTint.get(itemKey) ?? ""}
                    ${selected.has(line.id) ? "ring-2 ring-blue-400" : ""}
                    ${dimmed ? "opacity-50" : ""}
                  `}
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0"
                    checked={selected.has(line.id)}
                    onChange={e => toggleSelect(i, (e.nativeEvent as MouseEvent).shiftKey)}
                    aria-label="Select line"
                  />

                  {opensItem
                    ? (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <select
                          className={inlineClass}
                          value={kindOf.get(line.group) ?? "sentence"}
                          onChange={e =>
                            setDraft(d => setGroupKind(d, line.group, e.target.value as CleanedGroupKind))}
                          aria-label="Item kind"
                          title="What this item produces"
                        >
                          <option value="sentence">Sentence</option>
                          <option value="vocab">Vocab</option>
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={itemIdx <= 0}
                          onClick={() => setDraft(d => moveItem(d, line.group, "up"))}
                          title="Move item up"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={itemIdx === itemOrder.length - 1}
                          onClick={() => setDraft(d => moveItem(d, line.group, "down"))}
                          title="Move item down"
                        >
                          ↓
                        </Button>
                        {isLinked
                          ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => unlinkItem(line.group)}
                              title="Unlink this item"
                            >
                              🔗✕
                            </Button>
                          )
                          : null}
                      </div>
                    )
                    : (
                      <span
                        className={`
                          shrink-0
                          ${isLinked
                        ? "w-7 text-center text-xs text-blue-500"
                        : "w-28"}
                        `}
                        aria-hidden
                      >
                        {isLinked ? "🔗" : null}
                      </span>
                    )}

                  <input
                    className={`
                      ${inlineClass}
                      min-w-40 flex-1
                    `}
                    value={line.text}
                    onChange={e => setDraft(d => updateLineText(d, line.id, e.target.value))}
                    onSelect={e =>
                      setCaret({
                        id: line.id,
                        index: e.currentTarget.selectionStart ?? 0,
                      })}
                    aria-label="Line text"
                  />

                  <select
                    className={inlineClass}
                    value={line.lang}
                    onChange={e => setDraft(d => updateLineLang(d, line.id, e.target.value))}
                    aria-label="Line language"
                  >
                    {langOptions.map(code => (
                      <option
                        key={code}
                        value={code}
                      >
                        {code}
                      </option>
                    ))}
                  </select>

                  <select
                    className={inlineClass}
                    value={line.role}
                    onChange={e => setDraft(d => updateLineRole(d, line.id, e.target.value as CleanedLineRole))}
                    aria-label="Line role"
                  >
                    {ROLES.map(r => (
                      <option
                        key={r.value}
                        value={r.value}
                      >
                        {r.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDraft(d => splitLineByScript(d, line.id))}
                    disabled={!hasScriptBoundary(line.text)}
                    title="Split into separate lines by language/script"
                  >
                    あ/A
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (caret) setDraft(d => splitLineAt(d, line.id, caret.index));
                    }}
                    disabled={
                      caret?.id !== line.id || caret.index <= 0 || caret.index >= line.text.length
                    }
                    title="Split this line into two at the cursor"
                  >
                    ✂
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLine(line.id)}
                    title="Delete line"
                  >
                    ✕
                  </Button>
                </div>
              );
            })}
            {draft.lines.length === 0
              ? <p className="text-sm text-muted-foreground">No lines to clean.</p>
              : null}
          </div>

          {/* Shared values */}
          <SharedCaptureFields
            sourceId={sourceId}
            page={page}
            language={language}
            tags={tags}
            notes={notes}
            languageLabel="Language fallback (shared)"
            onSourceIdChange={setSourceId}
            onPageChange={setPage}
            onLanguageChange={setLanguage}
            onTagsChange={setTags}
            onNotesChange={setNotes}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={updateCapture.isPending || !dirty}
            >
              {updateCapture.isPending ? "Saving…" : "Save grouping"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(baseline)}
              disabled={!dirty}
            >
              Reset
            </Button>
            {!dirty && !updateCapture.isPending
              ? <span className="text-sm text-green-700">Grouping saved.</span>
              : null}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resulting items —
            {" "}
            {totalValid}
          </CardTitle>
          <CardDescription>
            Live preview of what each group produces. Groups with no text line are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.sentences.length > 0
            ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  Sentences —
                  {" "}
                  {preview.sentences.length}
                </h3>
                {preview.sentences.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-input p-2 text-sm"
                  >
                    <div className="font-medium">{s.text}</div>
                    {s.translation ? <div className="text-muted-foreground">{s.translation}</div> : null}
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {s.language}
                      </span>
                      {(s.vocabIds ?? []).map(id => (
                        <span
                          key={id}
                          className="
                            rounded-full bg-blue-50 px-2 py-0.5 text-xs
                            text-blue-700
                          "
                        >
                          {vocabName(id)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
            : null}

          {preview.vocab.length > 0
            ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">
                  Vocab —
                  {" "}
                  {preview.vocab.length}
                </h3>
                {preview.vocab.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-input p-2 text-sm"
                  >
                    <span className="font-medium">{v.term}</span>
                    {v.reading ? <span className="ml-2 text-muted-foreground">{v.reading}</span> : null}
                    {v.meaning ? <span className="ml-2">{v.meaning}</span> : null}
                    <span className="ml-2 text-xs text-muted-foreground">{v.language}</span>
                  </div>
                ))}
              </div>
            )
            : null}

          {totalValid === 0
            ? <p className="text-sm text-muted-foreground">Nothing to create yet.</p>
            : null}
          {preview.skipped > 0
            ? (
              <p className="text-xs text-muted-foreground">
                {preview.skipped}
                {" "}
                group(s) skipped (no text line).
              </p>
            )
            : null}

          {done ? <p className="text-sm font-medium text-green-700">{done}</p> : null}
          {createSentences.isError || createVocab.isError
            ? <p className="text-sm text-destructive">Could not create items.</p>
            : null}

          <Button
            type="button"
            onClick={() => void create()}
            disabled={busy || totalValid === 0}
          >
            {busy ? "Creating…" : `Create ${totalValid} item(s)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
