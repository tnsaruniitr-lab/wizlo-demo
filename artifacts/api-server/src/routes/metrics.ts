import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, exceptionsTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";

const router = Router();

router.get("/metrics/dashboard", async (req, res) => {
  try {
    const allCases = await db.select().from(casesTable);
    const activeCases = allCases.filter(c => c.current_status !== "CASE_CLOSED");

    const allExceptions = await db.select().from(exceptionsTable);
    const openExceptions = allExceptions.filter(e => e.status === "open");
    const highSeverity = openExceptions.filter(e => e.severity === "high");
    const paymentQueue = openExceptions.filter(e => e.exception_type === "PAYMENT_FAILED");
    const providerBreaches = openExceptions.filter(e => e.exception_type === "PROVIDER_REVIEW_DELAY");
    const pharmacyDelays = openExceptions.filter(e => e.exception_type === "PHARMACY_DELAY");
    const refillRisk = openExceptions.filter(e => e.exception_type === "REFILL_DUE");

    const casesByStatus: Record<string, number> = {};
    for (const c of activeCases) {
      casesByStatus[c.current_status] = (casesByStatus[c.current_status] ?? 0) + 1;
    }

    const casesByProgram: Record<string, number> = {};
    for (const c of activeCases) {
      casesByProgram[c.program_type] = (casesByProgram[c.program_type] ?? 0) + 1;
    }

    const avgTimeStuckHours = activeCases.length > 0
      ? activeCases.reduce((sum, c) => {
          return sum + (Date.now() - new Date(c.updated_at).getTime()) / 3600000;
        }, 0) / activeCases.length
      : 0;

    res.json({
      active_cases: activeCases.length,
      open_exceptions: openExceptions.length,
      high_severity: highSeverity.length,
      avg_time_stuck_hours: Math.round(avgTimeStuckHours * 10) / 10,
      payment_recovery_queue: paymentQueue.length,
      provider_sla_breaches: providerBreaches.length,
      pharmacy_delays: pharmacyDelays.length,
      refill_risk_cases: refillRisk.length,
      cases_by_status: casesByStatus,
      cases_by_program: casesByProgram,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting dashboard metrics");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/metrics/exceptions-by-type", async (req, res) => {
  try {
    const exceptions = await db.select().from(exceptionsTable);
    const openExceptions = exceptions.filter(e => e.status === "open");

    const byType: Record<string, { count: number; severity: string }> = {};
    for (const e of openExceptions) {
      if (!byType[e.exception_type]) {
        byType[e.exception_type] = { count: 0, severity: e.severity };
      }
      byType[e.exception_type].count++;
    }

    const result = Object.entries(byType).map(([exception_type, { count, severity }]) => ({
      exception_type,
      count,
      severity,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error getting exceptions by type");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
