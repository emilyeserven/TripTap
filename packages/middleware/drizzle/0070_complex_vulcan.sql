ALTER TABLE "reading_sessions" ADD COLUMN "passive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "time_spent_minutes" integer DEFAULT 0 NOT NULL;