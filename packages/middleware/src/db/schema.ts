import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** `sentences` table — one row per stored example sentence. */
export const sentences = pgTable("sentences", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  translation: text("translation").notNull(),
  language: text("language").notNull(),
  source: text("source"),
  notes: text("notes"),
  tags: text("tags"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).notNull().defaultNow(),
});

export type SentenceRow = typeof sentences.$inferSelect;
export type NewSentenceRow = typeof sentences.$inferInsert;
