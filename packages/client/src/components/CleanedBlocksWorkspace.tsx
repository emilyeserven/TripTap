import type {
  Capture,
  CleanedBlocks,
  CleanedGroupKind,
  CleanedLineRole,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { SourcePicker } from "./SourcePicker";

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
  deriveItems,
  LANG_NAMES,
  mergeIntoPrevGroup,
  moveLine,
  seedCleanedBlocks,
  setGroupKind,
  splitToOwnGroup,
  toggleIgnoredLang,
  updateLineLang,
  updateLineRole,
  updateLineText,
} from "@/lib/cleanedBlocks";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
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

  // Group ordering + which line opens each group (for the per-group kind selector) + tint colours.
  const {
    groupTint, firstLineOfGroup, presentLangs,
  } = useMemo(() => {
    const order: string[] = [];
    const first = new Map<string, string>();
    const langs = new Set<string>();
    for (const line of draft.lines) {
      langs.add(line.lang);
      if (!first.has(line.group)) {
        first.set(line.group, line.id);
        order.push(line.group);
      }
    }
    const tint = new Map(order.map((id, i) => [id, GROUP_TINTS[i % GROUP_TINTS.length]]));
    return {
      groupTint: tint,
      firstLineOfGroup: first,
      presentLangs: [...langs].sort(),
    };
  }, [draft.lines]);

  const kindOf = new Map<string, CleanedGroupKind>(draft.groups.map(g => [g.id, g.kind]));
  const ignored = new Set(draft.ignoredLangs);

  // Language options: the standard set plus any code actually present on a line.
  const langOptions = [...new Set([...Object.keys(LANG_NAMES), ...presentLangs])].sort();

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cleaned blocks</CardTitle>
          <CardDescription>
            Fix each line, set its language, and group continuation / translation / furigana lines
            together. Each group becomes one sentence or vocab entry; mark page furniture as
            “structure” or ignore a whole language to leave it out.
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

          {/* Line editor */}
          <div className="space-y-1.5">
            {draft.lines.map((line, i) => {
              const opensGroup = firstLineOfGroup.get(line.group) === line.id;
              const dimmed = line.role === "structure" || ignored.has(line.lang);
              return (
                <div
                  key={line.id}
                  className={`
                    flex flex-wrap items-center gap-1.5 rounded-md border
                    border-l-4 border-input bg-card p-1.5
                    ${groupTint.get(line.group) ?? ""}
                    ${dimmed ? "opacity-50" : ""}
                  `}
                >
                  {opensGroup
                    ? (
                      <select
                        className={inlineClass}
                        value={kindOf.get(line.group) ?? "sentence"}
                        onChange={e =>
                          setDraft(d => setGroupKind(d, line.group, e.target.value as CleanedGroupKind))}
                        aria-label="Group kind"
                        title="What this group produces"
                      >
                        <option value="sentence">Sentence</option>
                        <option value="vocab">Vocab</option>
                      </select>
                    )
                    : (
                      <span
                        className="w-18 shrink-0"
                        aria-hidden
                      />
                    )}

                  <input
                    className={`
                      ${inlineClass}
                      min-w-40 flex-1
                    `}
                    value={line.text}
                    onChange={e => setDraft(d => updateLineText(d, line.id, e.target.value))}
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

                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={i === 0}
                      onClick={() => setDraft(d => moveLine(d, line.id, "up"))}
                      title="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={i === draft.lines.length - 1}
                      onClick={() => setDraft(d => moveLine(d, line.id, "down"))}
                      title="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={opensGroup}
                      onClick={() => setDraft(d => mergeIntoPrevGroup(d, line.id))}
                      title="Join into the group above"
                    >
                      Join↥
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDraft(d => splitToOwnGroup(d, line.id))}
                      title="Split into its own group"
                    >
                      Split
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDraft(d => deleteLine(d, line.id))}
                      title="Delete line"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              );
            })}
            {draft.lines.length === 0
              ? <p className="text-sm text-muted-foreground">No lines to clean.</p>
              : null}
          </div>

          {/* Shared values */}
          <div
            className="
              grid gap-3
              sm:grid-cols-2
            "
          >
            <SourcePicker
              value={sourceId}
              onChange={setSourceId}
            />
            <label className="block text-sm font-medium text-slate-700">
              Page / location (shared)
              <input
                className={fieldClass}
                value={page}
                onChange={e => setPage(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Language fallback (shared)
              <input
                className={fieldClass}
                value={language}
                onChange={e => setLanguage(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Tags (shared)
              <input
                className={fieldClass}
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </label>
            <label
              className="
                block text-sm font-medium text-slate-700
                sm:col-span-2
              "
            >
              Notes (shared)
              <input
                className={fieldClass}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>

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
