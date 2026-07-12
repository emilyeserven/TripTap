CREATE TABLE "my_sentences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"translation" text,
	"language" text NOT NULL,
	"practice_sentence_id" uuid,
	"needs_correction" boolean DEFAULT true NOT NULL,
	"correction" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sentence_vocab" (
	"practice_sentence_id" uuid NOT NULL,
	"vocab_id" uuid NOT NULL,
	CONSTRAINT "practice_sentence_vocab_practice_sentence_id_vocab_id_pk" PRIMARY KEY("practice_sentence_id","vocab_id")
);
--> statement-breakpoint
ALTER TABLE "my_sentences" ADD CONSTRAINT "my_sentences_practice_sentence_id_practice_sentences_id_fk" FOREIGN KEY ("practice_sentence_id") REFERENCES "public"."practice_sentences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sentence_vocab" ADD CONSTRAINT "practice_sentence_vocab_practice_sentence_id_practice_sentences_id_fk" FOREIGN KEY ("practice_sentence_id") REFERENCES "public"."practice_sentences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sentence_vocab" ADD CONSTRAINT "practice_sentence_vocab_vocab_id_vocab_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocab"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sentences" DROP COLUMN "mine";