import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { patientsTable } from "./patients";

export const casesTable = pgTable("cases", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  patient_id: text("patient_id").references(() => patientsTable.id).notNull(),
  program_type: text("program_type").notNull(),
  current_status: text("current_status").notNull(),
  assigned_provider: text("assigned_provider"),
  assigned_ops_owner: text("assigned_ops_owner"),
  priority: text("priority").default("normal").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
