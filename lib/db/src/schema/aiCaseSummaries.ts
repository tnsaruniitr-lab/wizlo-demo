import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const aiCaseSummariesTable = pgTable("ai_case_summaries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  case_id: text("case_id").references(() => casesTable.id).notNull(),
  summary: text("summary"),
  risk_level: text("risk_level"),
  reason_stuck: text("reason_stuck"),
  recommended_action: text("recommended_action"),
  draft_message: text("draft_message"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiCaseSummarySchema = createInsertSchema(aiCaseSummariesTable).omit({ id: true, created_at: true });
export type InsertAiCaseSummary = z.infer<typeof insertAiCaseSummarySchema>;
export type AiCaseSummary = typeof aiCaseSummariesTable.$inferSelect;
