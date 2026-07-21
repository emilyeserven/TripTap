ALTER TABLE "drill_sessions" ADD COLUMN "bookmark_id" text;--> statement-breakpoint
ALTER TABLE "drill_sessions" ADD COLUMN "bookmark_title" text;--> statement-breakpoint
ALTER TABLE "drill_sessions" ADD COLUMN "bookmark_url" text;--> statement-breakpoint
ALTER TABLE "drill_sessions" ADD COLUMN "section" jsonb;