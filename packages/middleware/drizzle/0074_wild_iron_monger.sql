ALTER TABLE "lessons" ADD COLUMN "learning_area" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "counts_toward_xp" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_sessions" ADD COLUMN "learning_area" text;--> statement-breakpoint
ALTER TABLE "listening_sessions" ADD COLUMN "counts_toward_xp" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "learning_area" text;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "counts_toward_xp" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shadowing_sessions" ADD COLUMN "learning_area" text;--> statement-breakpoint
ALTER TABLE "shadowing_sessions" ADD COLUMN "counts_toward_xp" boolean DEFAULT true NOT NULL;