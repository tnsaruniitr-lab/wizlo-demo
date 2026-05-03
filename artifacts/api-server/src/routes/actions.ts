import { Router } from "express";
import { db } from "@workspace/db";
import { actionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/actions/:id/send", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(actionsTable).where(eq(actionsTable.id, id)).then(r => r[0]);
    if (!existing) return res.status(404).json({ error: "Action not found" });

    const [updated] = await db.update(actionsTable)
      .set({ status: "sent", executed_at: new Date() })
      .where(eq(actionsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error sending action");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
