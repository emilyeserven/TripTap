CREATE TABLE "writing_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "writings" ADD COLUMN "prompt_title" text;--> statement-breakpoint
ALTER TABLE "writings" ADD COLUMN "prompt_text" text;