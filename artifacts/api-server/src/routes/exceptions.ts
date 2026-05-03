import { Router } from "express";
import { db } from "@workspace/db";
import { exceptionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/exceptions", async (req, res) => {
  try {
    const { status, severity, case_id } = req.query as Record<string, string>;

    let exceptions = await db.select().from(exceptionsTable).orderBy(desc(exceptionsTable.created_at));

    if (status) exceptions = exceptions.filter(e => e.status === status);
    if (severity) exceptions = exceptions.filter(e => e.severity === severity);
    if (case_id) exceptions = exceptions.filter(e => e.case_id === case_id);

    res.json(exceptions);
  } catch (err) {
    req.log.error({ err }, "Error listing exceptions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/exceptions/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(exceptionsTable).where(eq(exceptionsTable.id, id)).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Exception not found" });

    const [updated] = await db.update(exceptionsTable)
      .set({ status: "resolved", resolved_at: new Date() })
      .where(eq(exceptionsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error resolving exception");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
