ALTER TABLE "writing_prompts" ADD COLUMN "text_en" text;--> statement-breakpoint
ALTER TABLE "writing_prompts" ADD COLUMN "difficulty" text DEFAULT 'Other' NOT NULL;