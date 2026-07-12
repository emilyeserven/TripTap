CREATE TABLE "listening_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"video_url" text,
	"language" text NOT NULL,
	"bookmark_id" text,
	"bookmark_title" text,
	"bookmark_url" text,
	"entries" jsonb,
	"terms" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shadowing_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"video_url" text,
	"language" text NOT NULL,
	"bookmark_id" text,
	"bookmark_title" text,
	"bookmark_url" text,
	"default_max_replays" integer DEFAULT 3 NOT NULL,
	"default_gap_ms" integer DEFAULT 0 NOT NULL,
	"segments" jsonb,
	"entries" jsonb,
	"terms" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
