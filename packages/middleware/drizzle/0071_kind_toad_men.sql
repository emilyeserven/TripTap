ALTER TABLE "ai_lesson_vocab" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vocab" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;