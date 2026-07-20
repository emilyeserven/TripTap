ALTER TABLE "drill_sessions" ADD COLUMN "rounds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "drill_sessions" ADD COLUMN "learning_area" text;--> statement-breakpoint
ALTER TABLE "shadowing_sessions" ADD COLUMN "completed_loops" integer DEFAULT 0 NOT NULL;