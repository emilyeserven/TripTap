import type { MigakuCandidate, MigakuImportDetail } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommitMigakuImport, useDeleteMigakuImport } from "@/hooks/useMigakuImports";
import { migakuImportsApi } from "@/lib/api";

interface RowState {
  include: boolean;
  kind: MigakuCandidate["kind"];
  text: string;
  meaning: string;
  tags: string;
}

/** Inline ruby preview of a candidate's Migaku-derived furigana. */
function ReadingPreview({
  reading,
}: { reading: MigakuCandidate["reading"] }) {
  if (!reading.length) return null;
  return (
    <p
      className="text-lg/loose"
      lang="ja"
    >
      {reading.map((tok, i) =>
        tok.r
          ? (
            <ruby key={i}>
              {tok.t}
              <rt className="text-[0.6em]">{tok.r}</rt>
            </ruby>
          )
          : <span key={i}>{tok.t}</span>)}
    </p>
  );
}

/** The review-and-commit workbench for a staged Migaku import. */
export function MigakuCandidateTable({
  detail,
}: { detail: MigakuImportDetail }) {
  const navigate = useNavigate();
  const commit = useCommitMigakuImport();
  const discard = useDeleteMigakuImport();
  const [language, setLanguage] = useState("Japanese");

  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(detail.candidates.map(c => [c.id, {
      // Duplicates are deselected by default (and skipped on commit regardless).
      include: !c.alreadyExists,
      kind: c.kind,
      text: c.text,
      meaning: c.meaning ?? "",
      tags: c.tags ?? "",
    }])));

  const update = (id: string, patch: Partial<RowState>) =>
    setRows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));

  const selectedCount = useMemo(
    () => Object.values(rows).filter(r => r.include).length,
    [rows],
  );

  const setAll = (include: boolean) =>
    setRows(prev => Object.fromEntries(Object.entries(prev).map(([id, r]) => [id, {
      ...r,
      include,
    }])));

  function handleCommit() {
    commit.mutate({
      id: detail.id,
      input: {
        language: language.trim() || "Japanese",
        items: detail.candidates.map((c) => {
          const r = rows[c.id];
          return {
            id: c.id,
            include: r.include,
            kind: r.kind,
            text: r.text,
            meaning: r.meaning.trim() ? r.meaning : null,
            tags: r.tags.trim() ? r.tags : null,
          };
        }),
      },
    }, {
      onSuccess: (result) => {
        const skipped = result.skipped
          ? ` · skipped ${result.skipped} duplicate(s)`
          : "";
        toast.success(
          `Imported ${result.sentencesCreated} sentence(s) and ${result.vocabCreated} vocab item(s)${skipped}`,
        );
        navigate({
          to: "/migaku-import",
        });
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="migaku-language">Language for imported items</Label>
          <Input
            id="migaku-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="max-w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAll(true)}
          >Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAll(false)}
          >Select none
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {detail.candidates.map((c) => {
          const r = rows[c.id];
          return (
            <Card
              key={c.id}
              className="p-4"
              data-included={r.include}
            >
              <div className="flex gap-3">
                <Checkbox
                  checked={r.include}
                  onCheckedChange={v => update(c.id, {
                    include: v === true,
                  })}
                  aria-label="Include this card"
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={r.kind}
                      onValueChange={v => update(c.id, {
                        kind: v as RowState["kind"],
                      })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sentence">Sentence</SelectItem>
                        <SelectItem value="vocab">Vocab</SelectItem>
                      </SelectContent>
                    </Select>
                    {c.alreadyExists
                      ? <Badge variant="secondary">Already in bank</Badge>
                      : null}
                    {c.hasAudio
                      ? (
                        <audio
                          controls
                          preload="none"
                          src={migakuImportsApi.mediaUrl(detail.id, c.id, "audio")}
                          className="h-8"
                        >
                          <track kind="captions" />
                        </audio>
                      )
                      : null}
                  </div>

                  <ReadingPreview reading={c.reading} />

                  <div
                    className="
                      grid gap-3
                      sm:grid-cols-2
                    "
                  >
                    <div className="space-y-1">
                      <Label
                        htmlFor={`text-${c.id}`}
                        className="text-xs text-muted-foreground"
                      >Text / term
                      </Label>
                      <Input
                        id={`text-${c.id}`}
                        value={r.text}
                        onChange={e => update(c.id, {
                          text: e.target.value,
                        })}
                        lang="ja"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`meaning-${c.id}`}
                        className="text-xs text-muted-foreground"
                      >Meaning
                      </Label>
                      <Input
                        id={`meaning-${c.id}`}
                        value={r.meaning}
                        onChange={e => update(c.id, {
                          meaning: e.target.value,
                        })}
                      />
                    </div>
                  </div>

                  {c.hasImage
                    ? (
                      <img
                        src={migakuImportsApi.mediaUrl(detail.id, c.id, "image")}
                        alt=""
                        className="max-h-40 rounded-sm border"
                      />
                    )
                    : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div
        className="
          sticky bottom-0 flex flex-wrap items-center justify-between gap-3
          border-t bg-background/95 py-3 backdrop-blur-sm
        "
      >
        <p className="text-sm text-muted-foreground">
          {selectedCount} of {detail.candidates.length} selected
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={discard.isPending}
            onClick={() =>
              discard.mutate(detail.id, {
                onSuccess: () => navigate({
                  to: "/migaku-import",
                }),
              })}
          >
            Discard import
          </Button>
          <Button
            type="button"
            onClick={handleCommit}
            disabled={commit.isPending || selectedCount === 0}
          >
            {commit.isPending ? "Importing…" : `Import ${selectedCount} item(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
