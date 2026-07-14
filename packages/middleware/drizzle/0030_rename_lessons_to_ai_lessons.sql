ALTER TABLE "lesson_categories" RENAME TO "ai_lesson_categories";--> statement-breakpoint
ALTER TABLE "lesson_culture" RENAME TO "ai_lesson_culture";--> statement-breakpoint
ALTER TABLE "lesson_grammar" RENAME TO "ai_lesson_grammar";--> statement-breakpoint
ALTER TABLE "lesson_source_sentences" RENAME TO "ai_lesson_source_sentences";--> statement-breakpoint
ALTER TABLE "lesson_vocab" RENAME TO "ai_lesson_vocab";--> statement-breakpoint
ALTER TABLE "lessons" RENAME TO "ai_lessons";--> statement-breakpoint
ALTER TABLE "ai_lesson_categories" RENAME COLUMN "lesson_id" TO "ai_lesson_id";--> statement-breakpoint
ALTER TABLE "ai_lesson_culture" RENAME COLUMN "lesson_id" TO "ai_lesson_id";--> statement-breakpoint
ALTER TABLE "ai_lesson_grammar" RENAME COLUMN "lesson_id" TO "ai_lesson_id";--> statement-breakpoint
ALTER TABLE "ai_lesson_source_sentences" RENAME COLUMN "lesson_id" TO "ai_lesson_id";--> statement-breakpoint
ALTER TABLE "ai_lesson_vocab" RENAME COLUMN "lesson_id" TO "ai_lesson_id";--> statement-breakpoint
ALTER TABLE "ai_lessons" DROP CONSTRAINT "lessons_slug_unique";--> statement-breakpoint
ALTER TABLE "ai_lesson_categories" DROP CONSTRAINT "lesson_categories_lesson_id_lessons_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_lesson_culture" DROP CONSTRAINT "lesson_culture_lesson_id_lessons_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_lesson_grammar" DROP CONSTRAINT "lesson_grammar_lesson_id_lessons_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_lesson_source_sentences" DROP CONSTRAINT "lesson_source_sentences_lesson_id_lessons_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_lesson_vocab" DROP CONSTRAINT "lesson_vocab_lesson_id_lessons_id_fk";
--> statement-breakpoint
DROP INDEX "lesson_categories_lesson_id_key_unique";--> statement-breakpoint
ALTER TABLE "ai_lesson_categories" ADD CONSTRAINT "ai_lesson_categories_ai_lesson_id_ai_lessons_id_fk" FOREIGN KEY ("ai_lesson_id") REFERENCES "public"."ai_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lesson_culture" ADD CONSTRAINT "ai_lesson_culture_ai_lesson_id_ai_lessons_id_fk" FOREIGN KEY ("ai_lesson_id") REFERENCES "public"."ai_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lesson_grammar" ADD CONSTRAINT "ai_lesson_grammar_ai_lesson_id_ai_lessons_id_fk" FOREIGN KEY ("ai_lesson_id") REFERENCES "public"."ai_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lesson_source_sentences" ADD CONSTRAINT "ai_lesson_source_sentences_ai_lesson_id_ai_lessons_id_fk" FOREIGN KEY ("ai_lesson_id") REFERENCES "public"."ai_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_lesson_vocab" ADD CONSTRAINT "ai_lesson_vocab_ai_lesson_id_ai_lessons_id_fk" FOREIGN KEY ("ai_lesson_id") REFERENCES "public"."ai_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_lesson_categories_ai_lesson_id_key_unique" ON "ai_lesson_categories" USING btree ("ai_lesson_id","key");--> statement-breakpoint
ALTER TABLE "ai_lessons" ADD CONSTRAINT "ai_lessons_slug_unique" UNIQUE("slug");