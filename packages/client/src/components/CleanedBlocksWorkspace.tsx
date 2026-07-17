import type {
  Capture,
  CleanedBlocks,
  CleanedGroupKind,
} from "@sentence-bank/types";

import { useEffect, useMemo, useState } from "react";

import { CleanedBulkActionBar } from "./CleanedBulkActionBar";
import { CleanedItemsPreview } from "./CleanedItemsPreview";
import { CleanedLangFilterBar } from "./CleanedLangFilterBar";
import { CleanedLineRow } from "./CleanedLineRow";
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
import { GROUP_TINTS } from "@/lib/cleanedBlocksUi";

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
          <CleanedLangFilterBar
            presentLangs={presentLangs}
            ignoredLangs={ignored}
            onToggle={code => setDraft(d => toggleIgnoredLang(d, code))}
          />

          <CleanedBulkActionBar
            selectedCount={selected.size}
            onStitch={() => setDraft(d => stitchLines(d, selectedIds()))}
            onUnstitch={() => setDraft(d => unstitchLines(d, selectedIds()))}
            onLink={() => setDraft(d => linkGroups(d, selectedIds()))}
            onUnlink={() => setDraft(d => unlinkGroups(d, selectedIds()))}
            onSetRole={role => setDraft(d => setLinesRole(d, selectedIds(), role))}
            onSetKind={kind => setDraft(d => setKindForLines(d, selectedIds(), kind))}
            onDelete={bulkDelete}
            onClear={clearSelection}
          />

          {/* Line editor */}
          <div className="space-y-1.5">
            {draft.lines.map((line, i) => {
              const itemKey = linkOf.get(line.group) ?? line.group;
              const itemIdx = itemOrder.indexOf(itemKey);
              return (
                <CleanedLineRow
                  key={line.id}
                  line={line}
                  checked={selected.has(line.id)}
                  dimmed={line.role === "structure" || line.role === "ignore" || ignored.has(line.lang)}
                  tintClass={itemTint.get(itemKey) ?? ""}
                  opensItem={firstLineOfItem.get(itemKey) === line.id}
                  isLinked={linkedGroupIds.has(line.group)}
                  kind={kindOf.get(line.group) ?? "sentence"}
                  canMoveUp={itemIdx > 0}
                  canMoveDown={itemIdx !== itemOrder.length - 1}
                  langOptions={langOptions}
                  caretIndex={caret?.id === line.id ? caret.index : null}
                  onToggleSelect={shift => toggleSelect(i, shift)}
                  onKindChange={kind => setDraft(d => setGroupKind(d, line.group, kind))}
                  onMoveUp={() => setDraft(d => moveItem(d, line.group, "up"))}
                  onMoveDown={() => setDraft(d => moveItem(d, line.group, "down"))}
                  onUnlinkItem={() => unlinkItem(line.group)}
                  onTextChange={text => setDraft(d => updateLineText(d, line.id, text))}
                  onCaretChange={index => setCaret({
                    id: line.id,
                    index,
                  })}
                  onLangChange={lang => setDraft(d => updateLineLang(d, line.id, lang))}
                  onRoleChange={role => setDraft(d => updateLineRole(d, line.id, role))}
                  onSplitByScript={() => setDraft(d => splitLineByScript(d, line.id))}
                  onSplitAtCaret={() => {
                    if (caret) setDraft(d => splitLineAt(d, line.id, caret.index));
                  }}
                  onRemove={() => removeLine(line.id)}
                />
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

      <CleanedItemsPreview
        preview={preview}
        vocabName={vocabName}
        done={done}
        hasError={createSentences.isError || createVocab.isError}
        busy={busy}
        onCreate={() => void create()}
      />
    </div>
  );
}
