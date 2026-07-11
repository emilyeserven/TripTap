CREATE TABLE "parse_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"target" text NOT NULL,
	"body" text NOT NULL,
	"boundary" text NOT NULL,
	"ignore_blank_lines" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentence_vocab" (
	"sentence_id" uuid NOT NULL,
	"vocab_id" uuid NOT NULL,
	CONSTRAINT "sentence_vocab_sentence_id_vocab_id_pk" PRIMARY KEY("sentence_id","vocab_id")
);
--> statement-breakpoint
CREATE TABLE "vocab" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" text NOT NULL,
	"reading" text,
	"meaning" text,
	"language" text NOT NULL,
	"source_id" uuid,
	"page" text,
	"tags" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentences" ALTER COLUMN "translation" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sentence_vocab" ADD CONSTRAINT "sentence_vocab_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."sentences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentence_vocab" ADD CONSTRAINT "sentence_vocab_vocab_id_vocab_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab" ADD CONSTRAINT "vocab_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;