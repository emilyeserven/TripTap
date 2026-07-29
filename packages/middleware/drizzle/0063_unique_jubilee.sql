CREATE TABLE "rule_tags" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"grammar_tag_id" text,
	"grammar_tag_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
