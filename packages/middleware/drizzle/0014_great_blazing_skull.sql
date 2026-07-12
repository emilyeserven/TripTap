CREATE TABLE "practice_sentences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"reading" text,
	"translation" text,
	"language" text NOT NULL,
	"target" text,
	"target_kind" text,
	"guess" text,
	"literal" text,
	"register" text,
	"nuance" text,
	"mine" text,
	"words" jsonb,
	"grammar" jsonb,
	"passes" jsonb,
	"source_id" uuid,
	"page" text,
	"capture_id" uuid,
	"sentence_id" uuid,
	"needs_correction" boolean DEFAULT true NOT NULL,
	"correction" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_sentences" ADD CONSTRAINT "practice_sentences_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sentences" ADD CONSTRAINT "practice_sentences_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sentences" ADD CONSTRAINT "practice_sentences_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."sentences"("id") ON DELETE set null ON UPDATE no action;