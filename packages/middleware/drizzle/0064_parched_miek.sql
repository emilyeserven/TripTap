CREATE TABLE "chunk_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correction_id" uuid,
	"batch_id" uuid NOT NULL,
	"chunk" text NOT NULL,
	"gloss" text NOT NULL,
	"format" text NOT NULL,
	"prompt" text NOT NULL,
	"answer" text NOT NULL,
	"wrong_form" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exported_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rule_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_tag_key" text NOT NULL,
	"axis" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"items" jsonb NOT NULL,
	"seed_correction_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exported_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	CONSTRAINT "rule_groups_rule_tag_key_unique" UNIQUE("rule_tag_key")
);
--> statement-breakpoint
ALTER TABLE "chunk_cards" ADD CONSTRAINT "chunk_cards_correction_id_corrections_id_fk" FOREIGN KEY ("correction_id") REFERENCES "public"."corrections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_rule_tag_key_rule_tags_key_fk" FOREIGN KEY ("rule_tag_key") REFERENCES "public"."rule_tags"("key") ON DELETE cascade ON UPDATE no action;