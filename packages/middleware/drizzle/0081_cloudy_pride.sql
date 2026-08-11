-- Merge the three sentence tables into one, discriminated by `kind`.
--
-- Hand-edited (precedent: 0030/0047/0048): drizzle-kit emitted the DDL skeleton, and the data
-- moves are interleaved so nothing is dropped before its rows have been copied. Row ids are
-- preserved verbatim — shadowing-list jsonb arrays, `writings.corrections[].mySentenceId`
-- snapshots, stored correction-import refs, and client deep links all keep resolving.
--
-- Order matters:
--   1. add the new columns/FKs to `sentences`;
--   2. copy `practice_sentences` in (their `derived_from_id` targets bank rows already present);
--   3. copy `my_sentences` in (their `derived_from_id` targets the practice rows from step 2);
--   4. merge `practice_sentence_vocab` into `sentence_vocab` (ids are preserved, so no collisions);
--   5. rename `practice_sentence_images` → `sentence_images` in place (keeps the blobs);
--   6. collapse the shadowing lists' two id arrays into one;
--   7. drop the emptied tables (CASCADE also removes the renamed image table's stale FK);
--   8. repoint the image table's FK at `sentences` and add the new indexes.
ALTER TABLE "sentences" ADD COLUMN "kind" text DEFAULT 'bank' NOT NULL;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "derived_from_id" uuid;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "needs_correction" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "correction" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "writing_id" uuid;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "lesson_id" uuid;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "actual_meaning" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "explanation" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "incorrect_grammar_terms" jsonb;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "reasons" jsonb;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "marks" jsonb;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "reading_note" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "target" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "target_kind" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "comprehension" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "guess" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "literal" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "register" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "nuance" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "words" jsonb;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "grammar" jsonb;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "passes" jsonb;--> statement-breakpoint
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_derived_from_id_sentences_id_fk" FOREIGN KEY ("derived_from_id") REFERENCES "public"."sentences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_writing_id_writings_id_fk" FOREIGN KEY ("writing_id") REFERENCES "public"."writings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "sentences" ("id", "kind", "text", "translation", "reading", "reading_error", "language", "terms", "source_id", "page", "capture_id", "derived_from_id", "needs_correction", "correction", "reading_note", "target", "target_kind", "comprehension", "guess", "literal", "register", "nuance", "words", "grammar", "passes", "created_at")
SELECT "id", 'practice', "text", "translation", "reading_tokens", "reading_error", "language", "terms", "source_id", "page", "capture_id", "sentence_id", "needs_correction", "correction", "reading", "target", "target_kind", "comprehension", "guess", "literal", "register", "nuance", "words", "grammar", "passes", "created_at"
FROM "practice_sentences";--> statement-breakpoint
INSERT INTO "sentences" ("id", "kind", "text", "translation", "reading", "reading_error", "language", "derived_from_id", "writing_id", "lesson_id", "needs_correction", "correction", "actual_meaning", "explanation", "terms", "incorrect_grammar_terms", "reasons", "marks", "shadowing_candidate", "created_at")
SELECT "id", 'mine', "text", "translation", "reading", "reading_error", "language", "practice_sentence_id", "writing_id", "lesson_id", "needs_correction", "correction", "actual_meaning", "explanation", "terms", "incorrect_grammar_terms", "reasons", "marks", "shadowing_candidate", "created_at"
FROM "my_sentences";--> statement-breakpoint
INSERT INTO "sentence_vocab" ("sentence_id", "vocab_id")
SELECT "practice_sentence_id", "vocab_id" FROM "practice_sentence_vocab"
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "practice_sentence_images" RENAME TO "sentence_images";--> statement-breakpoint
ALTER TABLE "sentence_images" RENAME COLUMN "practice_sentence_id" TO "sentence_id";--> statement-breakpoint
UPDATE "shadowing_lists" SET "sentence_ids" = coalesce("sentence_ids", '[]'::jsonb) || coalesce("my_sentence_ids", '[]'::jsonb);--> statement-breakpoint
ALTER TABLE "shadowing_lists" DROP COLUMN "my_sentence_ids";--> statement-breakpoint
ALTER TABLE "my_sentences" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_sentence_vocab" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "practice_sentences" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "my_sentences" CASCADE;--> statement-breakpoint
DROP TABLE "practice_sentence_vocab" CASCADE;--> statement-breakpoint
DROP TABLE "practice_sentences" CASCADE;--> statement-breakpoint
ALTER TABLE "sentence_images" ADD CONSTRAINT "sentence_images_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."sentences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sentences_incorrect_grammar_terms_gin" ON "sentences" USING gin ("incorrect_grammar_terms");--> statement-breakpoint
CREATE INDEX "sentences_kind_idx" ON "sentences" USING btree ("kind");
