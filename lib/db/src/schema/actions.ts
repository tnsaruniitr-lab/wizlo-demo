import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { casesTable } from "./cases";

export const actionsTable = pgTable("actions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  case_id: text("case_id").references(() => casesTable.id).notNull(),
  action_type: text("action_type").notNull(),
  target: text("target"),
  message: text("message"),
  status: text("status").default("draft").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  executed_at: timestamp("executed_at"),
});

export const insertActionSchema = createInsertSchema(actionsTable).omit({ id: true, created_at: true });
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actionsTable.$inferSelect;
