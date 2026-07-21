ALTER TABLE "listening_sessions" ADD COLUMN "passive" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "listening_sessions" ADD COLUMN "duration_minutes" integer DEFAULT 0 NOT NULL;
