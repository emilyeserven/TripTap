CREATE TABLE "grammar_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" text NOT NULL,
	"tag_name" text NOT NULL,
	"title" text NOT NULL,
	"nuance" text,
	"summary" text,
	"constructions" jsonb,
	"relations" jsonb,
	"resources" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grammar_notes_tag_id_unique" UNIQUE("tag_id")
);
