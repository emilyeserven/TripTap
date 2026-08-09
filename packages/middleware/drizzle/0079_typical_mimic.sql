CREATE TABLE "kanji_status" (
	"char" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
