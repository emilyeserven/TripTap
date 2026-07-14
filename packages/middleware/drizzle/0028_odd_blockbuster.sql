ALTER TABLE "question_sheets" ADD COLUMN "bookmark_id" text;--> statement-breakpoint
ALTER TABLE "question_sheets" ADD COLUMN "bookmark_title" text;--> statement-breakpoint
ALTER TABLE "question_sheets" ADD COLUMN "bookmark_url" text;--> statement-breakpoint
ALTER TABLE "question_sheets" ADD COLUMN "due_date" timestamp with time zone;