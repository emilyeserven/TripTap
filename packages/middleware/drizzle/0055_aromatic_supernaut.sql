ALTER TABLE "question_sheets" ADD COLUMN "first_question_number" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
-- The "section" column now holds an array of section refs (multiple sections per sheet). Wrap any
-- existing single-object value in a one-element array so old rows match the new shape.
UPDATE "question_sheets" SET "section" = jsonb_build_array("section") WHERE "section" IS NOT NULL AND jsonb_typeof("section") = 'object';