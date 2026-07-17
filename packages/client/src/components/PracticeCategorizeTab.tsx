import type { PracticeDraft, SetPracticeDraft } from "@/lib/practiceEditor";
import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { PracticeField } from "./PracticeField";
import { SourcePicker } from "./SourcePicker";
import { TermPicker } from "./TermPicker";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGISTERS } from "@/lib/practiceEditor";

/** Step — Categorize: register, page, source, and the four term-channel pickers. */
export function PracticeCategorizeTab({
  draft,
  set,
  footer,
}: {
  draft: PracticeDraft;
  set: SetPracticeDraft;
  footer: ReactNode;
}) {
  const termsFor = (cat: SentenceTermCategory) =>
    draft.terms.filter(t => (t.category ?? "vocabulary") === cat);
  const setTermsFor = (cat: SentenceTermCategory, next: SentenceTermRef[]) =>
    set("terms", [...draft.terms.filter(t => (t.category ?? "vocabulary") !== cat), ...next]);

  return (
    <>
      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <PracticeField label="Register">
          <Select
            value={draft.register}
            onValueChange={v => set("register", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTERS.map(r => (
                <SelectItem
                  key={r}
                  value={r}
                >
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PracticeField>
        <PracticeField label="Page / location">
          <Input
            value={draft.page}
            onChange={e => set("page", e.target.value)}
            placeholder="p. 42"
          />
        </PracticeField>
      </div>
      <SourcePicker
        value={draft.sourceId}
        onChange={id => set("sourceId", id)}
      />
      <div className="space-y-4">
        <TermPicker
          category="vocabulary"
          label="Vocabulary tags"
          value={termsFor("vocabulary")}
          onChange={n => setTermsFor("vocabulary", n)}
        />
        <TermPicker
          category="grammar"
          label="Grammar tags"
          value={termsFor("grammar")}
          onChange={n => setTermsFor("grammar", n)}
        />
        <TermPicker
          category="general"
          label="General tags"
          value={termsFor("general")}
          onChange={n => setTermsFor("general", n)}
        />
        <TermPicker
          category="resource"
          label="Resources"
          value={termsFor("resource")}
          onChange={n => setTermsFor("resource", n)}
        />
      </div>
      {footer}
    </>
  );
}
