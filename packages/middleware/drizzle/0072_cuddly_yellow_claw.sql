CREATE TABLE "dialogues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"language" text NOT NULL,
	"script" text NOT NULL,
	"lines" jsonb,
	"self_speakers" jsonb,
	"counts_toward_xp" boolean DEFAULT false NOT NULL,
	"learning_area" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
