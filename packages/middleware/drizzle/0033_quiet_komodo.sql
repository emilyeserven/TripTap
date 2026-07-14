ALTER TABLE "drill_reason_categories" ADD COLUMN "reasons" jsonb;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "lesson_id" uuid;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "reasons" jsonb;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD CONSTRAINT "my_sentences_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;