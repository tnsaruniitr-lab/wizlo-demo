import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const caseEventsTable = pgTable("case_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  case_id: text("case_id").references(() => casesTable.id).notNull(),
  event_type: text("event_type").notNull(),
  payload: jsonb("payload"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertCaseEventSchema = createInsertSchema(caseEventsTable).omit({ id: true, created_at: true });
export type InsertCaseEvent = z.infer<typeof insertCaseEventSchema>;
export type CaseEvent = typeof caseEventsTable.$inferSelect;
