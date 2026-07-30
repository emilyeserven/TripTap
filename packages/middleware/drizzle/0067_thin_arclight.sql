CREATE TABLE "practice_sentence_images" (
	"practice_sentence_id" uuid PRIMARY KEY NOT NULL,
	"image" "bytea" NOT NULL,
	"image_mime" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_sentence_images" ADD CONSTRAINT "practice_sentence_images_practice_sentence_id_practice_sentences_id_fk" FOREIGN KEY ("practice_sentence_id") REFERENCES "public"."practice_sentences"("id") ON DELETE cascade ON UPDATE no action;