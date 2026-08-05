ALTER TABLE "my_sentences" ADD COLUMN "reading" jsonb;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "reading_error" text;--> statement-breakpoint
ALTER TABLE "practice_sentences" ADD COLUMN "reading_tokens" jsonb;--> statement-breakpoint
ALTER TABLE "practice_sentences" ADD COLUMN "reading_error" text;