CREATE TABLE "theory_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"title" text,
	"entry_mode" text DEFAULT 'pages' NOT NULL,
	"pages" integer,
	"density" text,
	"word_count" integer,
	"notes_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listening_sessions" ADD COLUMN "date" date;--> statement-breakpoint
UPDATE "listening_sessions" SET "date" = ("created_at" AT TIME ZONE 'UTC')::date WHERE "date" IS NULL;--> statement-breakpoint
ALTER TABLE "listening_sessions" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "date" date;--> statement-breakpoint
UPDATE "reading_sessions" SET "date" = ("created_at" AT TIME ZONE 'UTC')::date WHERE "date" IS NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shadowing_sessions" ADD COLUMN "date" date;--> statement-breakpoint
UPDATE "shadowing_sessions" SET "date" = ("created_at" AT TIME ZONE 'UTC')::date WHERE "date" IS NULL;--> statement-breakpoint
ALTER TABLE "shadowing_sessions" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "writings" ADD COLUMN "date" date;--> statement-breakpoint
UPDATE "writings" SET "date" = ("created_at" AT TIME ZONE 'UTC')::date WHERE "date" IS NULL;--> statement-breakpoint
ALTER TABLE "writings" ALTER COLUMN "date" SET NOT NULL;
