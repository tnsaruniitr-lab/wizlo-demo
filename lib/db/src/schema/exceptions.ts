import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const exceptionsTable = pgTable("exceptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  case_id: text("case_id").references(() => casesTable.id).notNull(),
  exception_type: text("exception_type").notNull(),
  severity: text("severity").notNull(),
  reason: text("reason").notNull(),
  recommended_action: text("recommended_action"),
  status: text("status").default("open").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  resolved_at: timestamp("resolved_at"),
});

export const insertExceptionSchema = createInsertSchema(exceptionsTable).omit({ id: true, created_at: true });
export type InsertException = z.infer<typeof insertExceptionSchema>;
export type Exception = typeof exceptionsTable.$inferSelect;
