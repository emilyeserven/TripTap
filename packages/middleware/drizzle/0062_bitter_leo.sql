CREATE TABLE "corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original" text NOT NULL,
	"corrected" text NOT NULL,
	"context" text,
	"corrector_note" text,
	"source" text DEFAULT 'self' NOT NULL,
	"lesson_id" uuid,
	"imported_from" jsonb,
	"batch_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"triage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;