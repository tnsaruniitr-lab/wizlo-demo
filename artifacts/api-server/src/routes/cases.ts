import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, caseEventsTable, exceptionsTable, aiCaseSummariesTable, actionsTable, patientsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeWithAI } from "../lib/ai";
import { GenerateActionBody } from "@workspace/api-zod";

const router = Router();

router.get("/cases", async (req, res) => {
  try {
    const { status, program_type, exception_type, severity } = req.query as Record<string, string>;

    let cases = await db.select().from(casesTable).orderBy(desc(casesTable.updated_at));

    if (status) {
      cases = cases.filter(c => c.current_status === status);
    }
    if (program_type) {
      cases = cases.filter(c => c.program_type === program_type);
    }

    const result = await Promise.all(cases.map(async (c) => {
      const patient = await db.select().from(patientsTable).where(eq(patientsTable.id, c.patient_id)).then(r => r[0]);

      let openExceptions = await db.select().from(exceptionsTable)
        .where(eq(exceptionsTable.case_id, c.id))
        .orderBy(desc(exceptionsTable.created_at));

      if (exception_type) {
        openExceptions = openExceptions.filter(e => e.exception_type === exception_type);
      }
      if (severity) {
        openExceptions = openExceptions.filter(e => e.severity === severity);
      }
      openExceptions = openExceptions.filter(e => e.status === "open");

      const latestSummary = await db.select().from(aiCaseSummariesTable)
        .where(eq(aiCaseSummariesTable.case_id, c.id))
        .orderBy(desc(aiCaseSummariesTable.created_at))
        .limit(1)
        .then(r => r[0] ?? null);

      const lastEvent = await db.select().from(caseEventsTable)
        .where(eq(caseEventsTable.case_id, c.id))
        .orderBy(desc(caseEventsTable.created_at))
        .limit(1)
        .then(r => r[0] ?? null);

      const hoursSinceLastEvent = lastEvent
        ? (Date.now() - new Date(lastEvent.created_at).getTime()) / 3600000
        : null;

      return {
        ...c,
        patient,
        open_exceptions: openExceptions,
        latest_ai_summary: latestSummary,
        hours_since_last_event: hoursSinceLastEvent,
      };
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing cases");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const c = await db.select().from(casesTable).where(eq(casesTable.id, id)).then(r => r[0]);
    if (!c) return res.status(404).json({ error: "Case not found" });

    const patient = await db.select().from(patientsTable).where(eq(patientsTable.id, c.patient_id)).then(r => r[0]);
    const events = await db.select().from(caseEventsTable).where(eq(caseEventsTable.case_id, id)).orderBy(caseEventsTable.created_at);
    const allExceptions = await db.select().from(exceptionsTable).where(eq(exceptionsTable.case_id, id)).orderBy(desc(exceptionsTable.created_at));
    const openExceptions = allExceptions.filter(e => e.status === "open");
    const aiSummaries = await db.select().from(aiCaseSummariesTable).where(eq(aiCaseSummariesTable.case_id, id)).orderBy(desc(aiCaseSummariesTable.created_at));
    const caseActions = await db.select().from(actionsTable).where(eq(actionsTable.case_id, id)).orderBy(desc(actionsTable.created_at));

    const lastEvent = events[events.length - 1] ?? null;
    const hoursSinceLastEvent = lastEvent
      ? (Date.now() - new Date(lastEvent.created_at).getTime()) / 3600000
      : null;

    res.json({
      ...c,
      patient,
      open_exceptions: openExceptions,
      latest_ai_summary: aiSummaries[0] ?? null,
      hours_since_last_event: hoursSinceLastEvent,
      events,
      all_exceptions: allExceptions,
      actions: caseActions,
      ai_summaries: aiSummaries,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting case");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cases/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    const c = await db.select().from(casesTable).where(eq(casesTable.id, id)).then(r => r[0]);
    if (!c) return res.status(404).json({ error: "Case not found" });

    const events = await db.select().from(caseEventsTable)
      .where(eq(caseEventsTable.case_id, id))
      .orderBy(caseEventsTable.created_at);

    const patient = await db.select().from(patientsTable).where(eq(patientsTable.id, c.patient_id)).then(r => r[0]);

    const analysis = await analyzeWithAI({
      program_type: c.program_type,
      state: patient?.state ?? "unknown",
      current_status: c.current_status,
      events: events.map(e => ({
        type: e.event_type,
        created_at: e.created_at.toISOString(),
        payload: e.payload,
      })),
    });

    const [summary] = await db.insert(aiCaseSummariesTable).values({
      case_id: id,
      summary: analysis.summary,
      risk_level: analysis.risk_level,
      reason_stuck: analysis.reason_stuck,
      recommended_action: analysis.recommended_action,
      draft_message: analysis.draft_message,
    }).returning();

    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Error analyzing case");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cases/:id/generate-action", async (req, res) => {
  try {
    const { id } = req.params;
    const body = GenerateActionBody.parse(req.body);

    const c = await db.select().from(casesTable).where(eq(casesTable.id, id)).then(r => r[0]);
    if (!c) return res.status(404).json({ error: "Case not found" });

    const latestSummary = await db.select().from(aiCaseSummariesTable)
      .where(eq(aiCaseSummariesTable.case_id, id))
      .orderBy(desc(aiCaseSummariesTable.created_at))
      .limit(1)
      .then(r => r[0] ?? null);

    const message = latestSummary?.draft_message ?? `Action required for case ${id}: ${body.action_type}`;

    const [action] = await db.insert(actionsTable).values({
      case_id: id,
      action_type: body.action_type,
      target: body.target ?? null,
      message,
      status: "draft",
    }).returning();

    res.json(action);
  } catch (err) {
    req.log.error({ err }, "Error generating action");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases/:id/events", async (req, res) => {
  try {
    const { id } = req.params;
    const events = await db.select().from(caseEventsTable)
      .where(eq(caseEventsTable.case_id, id))
      .orderBy(caseEventsTable.created_at);
    res.json(events);
  } catch (err) {
    req.log.error({ err }, "Error getting case events");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
