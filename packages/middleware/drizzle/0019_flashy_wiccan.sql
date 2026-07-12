CREATE TABLE "writings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"meaning" text,
	"comments" text,
	"language" text NOT NULL,
	"ready_to_review" boolean DEFAULT false NOT NULL,
	"terms" jsonb,
	"corrections" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "my_sentences" ADD COLUMN "writing_id" uuid;--> statement-breakpoint
ALTER TABLE "my_sentences" ADD CONSTRAINT "my_sentences_writing_id_writings_id_fk" FOREIGN KEY ("writing_id") REFERENCES "public"."writings"("id") ON DELETE set null ON UPDATE no action;