ALTER TABLE "my_sentences" ADD COLUMN "actual_meaning" text;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "explanation" text;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "terms" jsonb;