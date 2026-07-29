CREATE TABLE "shadowing_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"sentence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"my_sentence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "shadowing_candidate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "shadowing_candidate" boolean DEFAULT false NOT NULL;