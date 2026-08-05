# Codebase & User-Flow Overlap Analysis

*Generated August 2026 from a full three-track exploration of the monorepo (middleware, client,
shared types + cross-feature flows). File/line references are to the state of `main` at commit
`e5999f2`.*

## Executive summary

TripTap's vertical-slice architecture made ~25 features easy to add — and easy to copy-paste.
The cost is now visible in two ways:

1. **Structural duplication.** Roughly **15% of hand-written client code (~8,000 of ~55k lines)**
   and a comparable share of the middleware is the same scaffolding repeated per feature:
   ~22 clone CRUD services, 37 hand-written route-schema files, 20 clone TanStack Query hooks,
   ~3,600 lines of near-identical route shells, 10 interchangeable list cards. Notably,
   `.fallowrc.json` excludes `packages/middleware/src/routes/**` from duplicate detection and
   turns off `unused-types` — the two largest duplication zones are in fallow's configured blind
   spots, so the health score under-reports this.

2. **Stranded capabilities.** More important than the line count: because near-identical entities
   were copied instead of shared, each capability the app has built exists on an arbitrary subset
   of features. Generated furigana works only on bank sentences and dialogues. Correction triage
   can't reach reading-session or practice-sentence corrections. Only 3 of 7 session types let
   the learner pick a learning area; 5 features have their XP area hardcoded. Grammar views join
   only 2 of the 8 entities that carry grammar tags. Bank vocab can't be starred into Renshuu;
   AI-lesson vocab can't carry sources or media.

**The core recommendation: unify the shared contracts first, then collapse the scaffolding.**
Each contract unification (terms, corrections, session envelope, sentence/vocab cores)
automatically grants existing capabilities to every feature that adopts the shared shape — the
"enrich features app-wide" payoff. The mechanical dedup (factories, generated schemas, page
shells) should follow, so the factories encode the unified contracts rather than freezing today's
fragmentation.

---

## Part 1 — Overlap findings

### A. Sentence fragmentation — 5 storage homes, 13 type shapes

The concept "a Japanese sentence with a translation" lives in five places:

| Home | Table / type | Role |
|---|---|---|
| Bank | `sentences` (schema.ts:76) | mined examples |
| My Sentences | `my_sentences` (schema.ts:286) | learner-produced, correction flow |
| Practice | `practice_sentences` (schema.ts:183) | study-aid cards |
| Dialogues | `dialogues.lines[]` (schema.ts:479, `DialogueLine`) | multi-speaker scripts |
| AI Lessons | `ai_lesson_source_sentences` (schema.ts:976) | lesson-mined sentences |

Plus eight more sentence-shaped types: `ExampleSentence` (Tatoeba), `RenshuuExampleSentence`,
`MigakuCandidate`, `ReadingLine`, `GrammarExample`, `ContrastPairSide`, and the client-only
`BasketSentence` / `AnkiSentenceRow` / `LinkedSentence`.

Every capability is stranded on a subset:

| Capability | Has it | Doesn't |
|---|---|---|
| Generated furigana (`FuriToken[]`) | `sentences`, `dialogues.lines` | `my_sentences`, `practice_sentences` (whose `reading` is a **free-text string** under the same column name — a type collision acknowledged in `routes/anki.tsx:83`), `ai_lesson_source_sentences` |
| Term tagging (`terms`) | sentences, my_sentences, practice_sentences | dialogues, ai-lesson sentences |
| `needsCorrection` / `correction` | my_sentences, practice_sentences (the latter never surfaced in UI) | the rest |
| `source_id` + `page` | sentences, practice_sentences | the rest |
| Audio/image media | sentences (S3 keys) | practice (bytea side table `practice_sentence_images`), others none |
| `shadowing_candidate` | sentences, my_sentences | — and `shadowing_lists` (schema.ts:618) must carry **two parallel arrays** `sentence_ids` + `my_sentence_ids` because of the split identity |

Provenance is ad hoc: `MySentence` has **five nullable link fields** (`writingId`,
`practiceSentenceId`, `lessonId`, plus reverse links `WordNote.mySentenceId` and
`WritingCorrection.mySentenceId`) with no discriminator — while one feature over,
`Correction.importedFrom: CorrectionImportRef { kind, id }` (correction.ts) solves the same
problem properly.

From the learner's perspective there are **12 distinct "add a sentence" entry points** landing in
3 different entities via 3 different forms/cards/list pages, and the sidebar has three
sentence-ish labels ("Sentences", "My Sentences", "Study Sentences") plus two labelled "Grammar"
(`/grammar` vs `/grammar-notes`).

### B. `SentenceTermRef` — the app's real join key, stored three incompatible ways

Term refs (bookmarks-app tags, category-stamped) are the only cross-feature join key in the app.
They are stored under **three conventions**:

| Convention | Entities |
|---|---|
| All-channels blob `terms: SentenceTermRef[]` (split at read time via `groupTermsByCategory`) | `Sentence`, `MySentence`, `PracticeSentence`, `Writing`, `ListeningSession`, `ShadowingSession` |
| Pre-split grammar-only `grammarTerms: SentenceTermRef[]` | `QuestionSheet`, `GrammarItem`, `SourceSentenceItem`, `ReadingLine`, `CorrectionImportCandidate` |
| Bespoke overlay `incorrectGrammarTerms` | `MySentence` |

Consequences:

- The unpack logic exists **three times**: two code paths in `client/src/lib/grammar-links.ts`
  (`:22` vs `:56`) and a third in `middleware/src/services/correction-import.ts:14` — the *only*
  server-side category filter in the codebase.
- The JSON validation schema for the same wire type is copied **11 times** across
  `middleware/src/routes/` (byte-identical in 5 files, inline in 4 more, near-variants in 2).
- **Zero server-side query support**: no index on any of the 9 jsonb columns, no "tagged-with"
  endpoint; every "what used this grammar point?" is a client-side N-fetch.
- **Dark joins — already built, not wired:** `grammar.tsx:81` calls
  `sentencesByGrammarTagId(manual, aiLessonSentences)` *without* the `mySentences` third argument
  that `GrammarNoteView` passes, so My Sentences never appear on the Grammar page. Question-sheet
  tags surface on `GrammarNoteView` but not `grammar.tsx`. Practice, writing, reading-line,
  listening and shadowing terms never reach any grammar view at all.
- Entities with **no tagging**: `Vocab`, `Lesson`, `DrillSession`, `TheorySession`, `Dialogue`,
  `AnswerSheet`, `Correction`, and more.

### C. Corrections — one learner act, six-plus representations

"This was wrong; here's the fix and why" is modelled six ways:

1. `corrections` table — `original / corrected / correctorNote / triage` (the triage pipeline)
2. `writings.corrections[]` (`WritingCorrection`) — with the `corrected: ""` = "no change needed"
   sentinel, requiring the `correctedText()` helper everywhere it's read
3. `my_sentences` — `needsCorrection / correction / actualMeaning / explanation / marks`
4. `answer_sheets.entries[]` (`AnswerSheetEntry`) — whose doc comment admits it "mirrors the
   `MySentence` entity's phrasing"
5. `reading_sessions` — per-line `ReadingLine.correction/note/verdict` **plus** a flat-prefixed
   clone `freeformCorrection / freeformNote / freeformVerdict`
6. `practice_sentences.needsCorrection / correction` — never surfaced in any UI

`services/correction-import.ts` (~280 LOC) exists purely as an adapter between these — and
implements its extraction **twice** (`mySentenceCandidates`/`writingCandidates`/
`answerSheetCandidates` at :62/:84/:130 vs a full re-implementation inside `resolveRef` at :183).
It also duplicates the client's `splitSentences()` byte-for-byte
(`client/src/lib/writing-corrections.ts:22` ↔ `services/correction-import.ts:23`, the latter
commented "mirrors the client's"). Even so, **reading and practice corrections cannot be imported
into triage at all** — a feature gap created directly by the duplication.

On the client, the track-changes editor `SentenceCorrector` (TipTap `CorrectMark`/`IncorrectMark`)
is well-shared (5 consumers), but reading sessions use plain textareas with no marks, and five
different components render "old text struck through → new text".

### D. Session envelope — 7 session types, arbitrarily distributed metadata

Drill, listening, shadowing, reading, theory, lessons, and dialogues are all
"date + title + payload" records, but the shared metadata is ragged:

| Field | drill | listening | shadowing | reading | theory | lesson | dialogue |
|---|---|---|---|---|---|---|---|
| bookmark quad (`bookmarkId/Title/Url` + `section`) | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ |
| `terms` | ✘ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| `notes` | ✔ | ✘ | ✘ | ✘ | ✔ | ✔ | ✘ |
| duration | ✘ | `durationMinutes` | `completedLoops` | `timeSpentMinutes` | ✘ | `durationMinutes` | ✘ |
| `passive` | ✘ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| learner-set `learningArea` | ✔ | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ |
| `countsTowardXp` | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| client XP preview | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ |

- The bookmark quad is copy-pasted verbatim on 4 tables, `question_sheets` has a **plural**
  variant (`sections` array, column still named `section`), and `GrammarResourceRef` is a sixth
  shape. No shared `BookmarkRef` type exists.
- Duration is spelled three ways and hand-mapped in `xp.ts`.
- Areas: reading/writing/listening/shadowing/lesson areas are **hardcoded** in
  `services/xp.ts` (:215, :260, :374, :402, :509) — a learner can retarget a drill's area but not
  a reading session's, with no domain justification.
- `services/xp.ts` (951 LOC) holds 9 clone scorers plus 11 hand-written column projections in
  `loadXpGrants()` — a parallel restatement of the schema that must be kept in sync manually.
  `roundXp` is duplicated in `services/activity.ts:6` (comment: "mirrors xp.ts"), and
  `TheorySessionForm` re-implements the server scorer client-side for its preview.
- The five session **forms** (1,546 lines) share a 40–60% identical skeleton — including a
  byte-identical `initialBookmark` prop + JSDoc in four of them — and `DrillSessionForm.tsx:24`
  defines its own UTC `todayIso()` while the others use the documented-correct
  `todayDateString()` (`lib/daily-lineup.ts:19`, "NOT toISOString, which is UTC").

### E. Vocab / word — 9–11 shapes of `{term, reading, meaning}`

The same triple under three naming conventions:

| Type | Fields | Home |
|---|---|---|
| `Vocab` | `term / reading / meaning` | bank |
| `VocabItem` (AI lesson) | `jp / yomi / en` | ai_lesson_vocab |
| `SourceVocab` | `w / y / m` | AI-lesson sentence breakdowns |
| `PracticeWord` | `w / r / m` | practice breakdowns |
| `WordNote` | `word / reading / meaning` + `mySentenceId` | reading sessions |
| `LessonWordNote` | `word / reading / meaning` + `notes` (no `mySentenceId`) | lessons |
| `DictionaryEntry`, `MigakuCandidate`, client `BasketVocab` / `AnkiVocabRow` | variants | — |

Costs:

- `vocabulary.tsx` is a **presentation-layer union only**: two card components
  (`VocabBankCard` vs `ai-lesson/VocabCard`), two filter functions whose search fields differ
  (the same search box behaves differently per half — `lib/vocab-filter.ts:24` documents it),
  no backend union endpoint. Bank vocab can't be starred into Renshuu; AI-lesson vocab can't
  carry `sourceId`/`page`/`tags`/`notes`/media. `starred` is declared twice with the same
  copy-pasted doc comment.
- `LessonWordNote` was consciously copied from `WordNote` (it imports `WordNoteStatus` from
  `reading-session.ts`) but dropped `mySentenceId` — so lesson word notes **can't "Make a
  sentence"** while reading word notes can. The two editors
  (`ReadingWordNotesEditor` 171 / `LessonWordNotes` 187, docstring: "adapted from the Reading
  Session word-note block") are ~65% identical.
- `sentence_vocab` and `practice_sentence_vocab` are structurally identical join tables with two
  95%-identical service files (`services/sentence-vocab.ts` ↔ `services/practice-sentence-vocab.ts`
  — same joins, same transactions, only the FK differs).

### F. Mechanical scaffolding — the slice template copied ~20× at every layer

**Types** (`packages/types/src/`): 26 `Entity + CreateXInput + UpdateXInput = Partial<Create>`
triads; one hand-written drift (`UpdateDialogueInput` re-declares every field instead of
`Partial<CreateDialogueInput>`); four byte-identical `*TagMap` generics
(`LearningAreaTagMap` / `MaterialTypeTagMap` / `DrillTagMap` / `TheoryTagMap`, index.ts:427–483)
whose docs admit they're "the same mapping/filter/badge machinery".

**Middleware services**: ~22 files repeat the `toX / toInsert / list / get / create / update /
delete` template (~1,600 near-duplicate lines). The `createdAt instanceof Date ? .toISOString()
: String(...)` incantation is inlined **47 times** while two rival `toIso` helpers exist
(`captures.ts:40`, `ai-lessons.ts:43`). Media accessors and delete-with-cleanup blocks are
duplicated between `sentences.ts` and `vocab.ts`. `settings.ts` (788 LOC) repeats the same
get/update pair **8 times**.

**Middleware routes** (37 files, 7,749 LOC): every field already declared in `@sentence-bank/types`
is restated as inline JSON schema. 11 copies of the terms schema, 4+1 of `bookmarkSectionRef`,
27 uuid-param blocks under 6 names, 18 `updateBody` spreads, 98 `"… not found"` literals,
6 copies of the proxy `handleError` ladder (503/502), byte-identical media-streaming loops
(`sentences.ts:185` ↔ `vocab.ts:93`), 4 multipart-upload handlers. Meanwhile
`types/src/ai-lesson.ts` and `practice-sentence.ts` already prove the fix: Zod schema →
`z.toJSONSchema(…, {target: "draft-7"})` fed straight to Fastify. Two features do it; 35 don't.

**External proxies**: `services/http.ts:fetchJsonWithTimeout` is the right abstraction, used by
5 services — but 5 more hand-rolled re-implementations exist (`ocr/util.ts:24`,
`ocr/google-vision.ts:104`, `bookmarks/util.ts:38`, `youtube-captions.ts:256`), plus 8 duplicated
`NotConfigured`/`Unavailable` error-class files, 3–4 copies of `resolveXConfig`, and a verbatim
duplicated `apiUrl()` (bookmarks ↔ dictionary).

**Client**: 20 clone hooks around `useEntityCacheSync` (~1,250 lines; 13 of them 65–69 lines and
92–95% identical) — and 5 hooks that *don't* use it (`useVocab`, `useSources`, `useSentences`,
`useCaptures`, `useDrillReasonCategories`), so detail-cache seeding and error toasts are
inconsistent across entities. ~35 identical `{list,get,create,update,remove}` api objects
(~600 lines). Route shells: 14 × `$id.tsx` layouts that are 13 identical lines each; 14 ×
`$id.edit.tsx` ~90% identical; 14 × `$id.index.tsx` ~85%; 12 × `new.tsx` ~80% (including 4
copies of the same 20-line bookmark `validateSearch` block) — **~3,600 lines total, ~80%
removable**. Ten compact list cards sharing one shell (~650 lines, 55–70% identical); six
~45-line enum `<Select>` wrappers; the AI-JSON import triple (prompt generator + skill card +
paste box) duplicated wholesale between AI Lessons and Practice (`SkillInstallCard` ↔
`PracticeBreakdownSkillCard` is ~95% byte-identical); two versions of the Migaku review screen
(`MigakuNoteReview` 530 / `MigakuCandidateTable` 287, ~250 lines of the latter a subset of the
former); four furigana ruby renderers and **two independent furigana toggle systems**
(`displayStore` vs `ai-lesson/FuriganaScope`); a `matches()` search helper re-implemented or
inlined in 14 places; a `toggle<T>(set, value)` helper copy-pasted 4×.

### G. Correctness bugs surfaced by the duplication

These are not style issues — each is a live defect caused by a copy diverging:

1. **Clipboard silently broken in 5 places.** `hooks/useCopyToClipboard.ts` documents that the
   app is served over plain HTTP on a Tailnet where `navigator.clipboard` is unavailable, and
   provides the fallback. Exactly **one** component uses it. `AiLessonPromptGenerator:30`,
   `SkillInstallCard:23`, `PracticeBreakdownSkillCard:23`, `PracticeBreakdownPromptGenerator:29`,
   and `CaptureExtractedText:44` call bare `navigator.clipboard.writeText` — silent no-ops on the
   documented deployment. `ExportPanel:126` re-implements the hook body inline.
2. **UTC date bug.** `DrillSessionForm.tsx:24`'s `todayIso()` uses `toISOString().slice(0,10)` —
   wrong near midnight local time; `lib/daily-lineup.ts:19` exists specifically to avoid this.
   `routes/lessons.new.tsx:20` is a third variant.
3. **Furigana overrides skipped.** `getFuriganaOverrides` lives in `services/sentences.ts:37`
   instead of `furigana.ts`, so `migaku/commit.ts:141`/`:315` and `renshuu/index.ts:96` generate
   furigana **without** the learner's vocab overrides.
4. **`MigakuReadingPreview` ignores the furigana toggle** that every other ruby renderer honours.
5. **`grammar.tsx:81` drops My Sentences** from the grammar join (works on `GrammarNoteView`).
6. **Renshuu export breaks on newlines.** `lib/anki.ts` has a `field()` normalizer;
   `lib/renshuu.ts` doesn't — a stray newline in a sentence corrupts the Renshuu bulk-import
   format. The eligibility predicate is also written twice.
7. **Inconsistent cache behaviour** for the 5 hooks that bypass `useEntityCacheSync` (§F).

---

## Part 2 — Recommendations

Ordered contract-first: unifying shared contracts is what turns dedup into app-wide enrichment.
Collapsing scaffolding first would freeze today's fragmentation into factories.

### Phase 0 — Bug-fix quick wins (no design decisions, small PRs)

Fix the seven items in §G: adopt `useCopyToClipboard` at the 5+1 call sites; replace both stray
`todayIso()` with `todayDateString`; move `getFuriganaOverrides` into `services/furigana.ts` and
pass overrides at the 3 missing call sites; honour the toggle in `MigakuReadingPreview`; pass
`mySentences` in `grammar.tsx`; add `field()` normalization to `lib/renshuu.ts`; migrate the 5
divergent hooks onto `useEntityCacheSync`.

### Phase 1 — Unify the shared contracts (highest enrichment leverage)

**1a. Terms.** Standardize on the all-channels `terms` blob + category helpers:

- One shared `termsSchema` module for routes (kill the 11 copies); one `grammarTermsOf()` in
  `@sentence-bank/types` (kill the 3 unpack paths). Migrate `grammarTerms` columns to the blob
  convention (data-compatible — the refs already carry `category`).
- Add a middleware **"tagged-with" endpoint** (one query over the term columns, or a normalized
  `entity_terms` table if jsonb scans get slow) so "what used this grammar point?" becomes one
  request.
- Wire the dark joins: My Sentences + question sheets + practice/writing/reading/listening/
  shadowing terms into `grammar.tsx` and `GrammarNoteView`.
- Extend `terms` to currently untagged entities (Vocab, Lesson, DrillSession, TheorySession,
  Dialogue) — nearly free once the field + schema + picker are shared.

*Payoff: the grammar/culture views become true cross-app indexes; every feature becomes
discoverable by tag.*

**1b. Corrections.** Introduce `CorrectionCore { original, corrected: string | null, note, marks,
verdict }` in `@sentence-bank/types` and adopt it across all six surfaces:

- Retire the `WritingCorrection.corrected === ""` sentinel (use `null`; one-time data migration).
- Move `splitSentences()` into `@sentence-bank/types` (precedent: `dialogue.ts` already ships
  runtime functions consumed by both packages).
- Collapse `correction-import.ts`'s duplicated extraction into one candidate-builder per source,
  and add the two missing sources (reading lines/freeform, practice sentences) to triage import.
- Offer `SentenceCorrector` (track changes) on reading lines and answer sheets uniformly; one
  shared strike-through diff renderer.

*Payoff: the triage → rule-tag → chunk-card pipeline sees every correction in the app; the
track-changes editor and failure stats work everywhere the learner gets corrected.*

**1c. Session envelope.** Introduce shared `BookmarkRef { id, title, url, section }` and a
`SessionBase` column group / type: `date, title, language, notes, durationMinutes, passive,
learningArea, countsTowardXp, terms, bookmark`.

- Migrate the 7 session tables onto it (rename `timeSpentMinutes` → `durationMinutes`; keep
  type-specific payloads as-is).
- Client: `<SessionMetaFields>` + a `useSessionForm()` hook replacing the five forms' shared 40–60%.
- Replace `xp.ts`'s 9 clone scorers + 11 hand-written projections with a **declarative registry**
  (`{ table, dateField, area | areaField, rate, unit }`); a new XP-bearing feature registers one
  descriptor instead of editing three places. Serve the Theory-style XP preview from one endpoint
  instead of a client-side re-implementation.

*Payoff: every session type gains learner-selectable learning area, `countsTowardXp`, passive
mode, notes, terms, bookmark sections, and a live XP preview at once — closing the XP
attribution gaps (radar/goals currently under-report because 6 of 10 activities can't declare an
area).*

**1d. Sentence & vocab cores.** Explicitly **not** a big-bang table merge — share contracts and
capabilities first; revisit storage merge only if the contracts converge:

- Normalize `reading` to `FuriToken[]` everywhere: migrate `practice_sentences.reading` (the
  free-text string), generate furigana for `my_sentences` and practice on create/update like the
  bank does. One ruby renderer (`SentenceText`) and **one** furigana toggle system (fold
  `FuriganaScope` into `displayStore`-backed context mounted once at the root).
- Replace `MySentence`'s five nullable provenance FKs with a `{ kind, id }` origin ref (pattern:
  `Correction.importedFrom`).
- One `TermEntry { term, reading, meaning }` core adopted by `Vocab`, AI-lesson vocab,
  `WordNote`/`LessonWordNote`, practice words, and the basket/export rows. Give `LessonWordNote`
  the `mySentenceId` link; give bank vocab the Renshuu-star; give AI-lesson vocab
  source/tags/media; make `vocabulary.tsx` a real union (one card, one filter, optionally one
  backend endpoint).
- Collapse the twin join-table services into one generic helper; pick one media strategy
  (object storage) and one media accessor/deleter shared by sentences, vocab, captures, practice.

*Payoff: furigana, dictionary lookup, example lookup, "Make a sentence", starring, tagging, and
Anki/Renshuu export become properties of "any Japanese text in the app", not of specific tables.*

### Phase 2 — Collapse the mechanical scaffolding

Do this **after** Phase 1 so the factories encode the unified contracts.

- **Types → routes:** define each entity's Zod schema once in `@sentence-bank/types` and derive
  both the TS types and the Fastify JSON schemas (`z.toJSONSchema`), extending the pattern
  `ai-lesson.ts`/`practice-sentence.ts` already prove. Kills the 37 hand-written schema files'
  duplication and the 11 termsSchema copies structurally.
- **Services:** a `crudService(table, { toWire, toInsert, order })` factory for the ~22 clone
  files; one shared `toIso`; shared media accessor/delete helpers; a `makeUpstream()` factory +
  one error module for the proxy services; one settings get/update helper.
- **Routes:** `crudRoutes(app, { path, tag, service, schemas })` plus shared param/upload/
  media-stream/error fragments; one `handleUpstreamError` plugin.
- **Client:** `crudApi<T, C, U>(path)` and `createEntityHooks(key, api, labels)` factories;
  `<EntityListPage>/<EntityDetailPage>/<EntityEditPage>` shells for the 14 route families (the
  13-line `$id.tsx` layouts can disappear entirely); `<EntityListCard>`; `<EnumSelect>`; shared
  `matches()`, `toggle()`, and date helpers; `<SkillCard>` + `<JsonImportBox>` replacing the
  duplicated AI-JSON import triple; one Migaku review surface (the generic table as a degenerate
  case of the grouped review); merge the `{furigana,reading-level}` context/scope/toggle triples
  into one generic.
- **Then update `.fallowrc.json`**: stop excluding `routes/**` from duplicate detection and
  re-enable `unused-types`, so future copy-paste regressions actually surface in the health score.

Estimated reduction: ~8,000 client lines and ~3,000 middleware lines, with behaviour-preserving
mechanics — but the real value is that adding feature #26 becomes a schema + a descriptor + a
payload component instead of ~15 copied files.

### Phase 3 — User-flow consolidation (UX)

- **One "add a sentence" entry point** with a destination choice (bank / mine / practice),
  replacing the 12 scattered paths' inconsistencies; keep the specialized dialogs
  (drill-mistake, word-note, highlight) but route them through the shared form.
- **One recommendation engine feeding every "what next?" surface.**
  `lib/start-recommendations.ts` (812 lines, tested) already exists; let `/`, `/start`, and the
  three hubs all render from it instead of maintaining five independent surfaces (`index.tsx` 307
  + `start.tsx` 707 both render `DueSoonCard` today).
- **Basket → export.** The basket collects sentences/vocab/grammar but has no path into
  `ExportPanel`; wire it in, and fold `LessonWordNotesRenshuuExport` into the panel.
- **Sidebar disambiguation** of the two "Grammar" entries and three sentence entries once the
  Phase 1d cores make the distinction explainable (or unnecessary).

---

## Part 3 — Existing good abstractions (extend, don't replace)

These prove each proposed abstraction already works in this codebase:

| Abstraction | Evidence |
|---|---|
| `useEntityCacheSync` | 20 consumers — the hook-factory seam already exists |
| `SessionNotes` + player stack | genuinely shared by listening + shadowing |
| `SentenceCorrector` + `lib/tiptap/*` | 5 consumers — the correction-editor seam |
| `SentenceImportDialog`, `BulkPasteDialog` | 2 consumers each — the import-review seam |
| `ExportPanel` | 2 routes, 7 modes — the export seam |
| Zod → JSON-schema routes | `ai-lesson.ts`, `practice-sentence.ts` — the route-schema seam |
| `services/http.ts:fetchJsonWithTimeout` | 5 proxy services — the upstream seam |
| `lib/start-recommendations.ts` | tested, 812 lines — the recommendation engine |
| `types/src/dialogue.ts` runtime functions | precedent for shared runtime code in the types package |
| `vocab.tsx` / `find-resource.index.tsx` redirect stubs | precedent for consolidating routes with documented rationale |

## Appendix — evidence index

- Sentence-table field matrix: `schema.ts:76/183/286/479/976`; reading-type collision
  `routes/anki.tsx:83`; parallel shadowing arrays `schema.ts:618`.
- Term-ref columns (9, under 4 names): `schema.ts:99, 210, 311, 314, 348, 391, 458, 535, 972, 994`;
  schema copies in `routes/{listening-sessions:25, my-sentences:58, practice-sentences:115,
  shadowing-sessions:47, writings:22, sentences:58, question-sheets:178, reading-sessions:59,
  ai-lessons:61}`; unpack paths `client/src/lib/grammar-links.ts:22,56`,
  `services/correction-import.ts:14`.
- Correction homes: `schema.ts:349, 303–308, 225–226, 421, 572–574, 1058`; duplicated extraction
  `services/correction-import.ts:62,84,130` vs `:183`; duplicated `splitSentences`
  `client/src/lib/writing-corrections.ts:22` ↔ `services/correction-import.ts:23`.
- Session envelope: bookmark quads `schema.ts:449–453, 520–524, 580–583, 743–746` (+ plural
  `376–382`); hardcoded areas `services/xp.ts:215,260,374,402,509`; scorers `xp.ts:183–588`;
  projections `xp.ts:815+`; `roundXp` duplicate `services/activity.ts:6`.
- Vocab shapes: `index.ts:142`, `ai-lesson.ts:81/140/269`, `practice-sentence.ts:17`,
  `reading-session.ts:52`, `lesson.ts:30`; twin services `services/sentence-vocab.ts` ↔
  `services/practice-sentence-vocab.ts`; union page `client/src/routes/vocabulary.tsx` +
  `lib/vocab-filter.ts:24`.
- Scaffolding counts: hooks (13 × 65–69 lines), api objects (`lib/api/sessions.ts` alone has 6),
  route shells (14 × `$id`/`$id.edit`/`$id.index`/`new`), route schemas (37 files, 7,749 LOC),
  services template (22 files), date→ISO ×47, `"… not found"` ×98.
- Bug list file refs: §G above.
