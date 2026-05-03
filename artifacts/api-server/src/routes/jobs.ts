import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, caseEventsTable, exceptionsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

function hoursSince(date: Date): number {
  return (Date.now() - new Date(date).getTime()) / 3600000;
}

function getLatestEventByType(events: Array<{ event_type: string; created_at: Date }>, type: string) {
  return events.filter(e => e.event_type === type).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] ?? null;
}

function hasEvent(events: Array<{ event_type: string }>, type: string): boolean {
  return events.some(e => e.event_type === type);
}

router.post("/jobs/run-exception-scan", async (req, res) => {
  try {
    const allCases = await db.select().from(casesTable);
    const activeCases = allCases.filter(c => c.current_status !== "CASE_CLOSED");

    let totalExceptionsCreated = 0;
    const exceptionsByType: Record<string, number> = {};

    for (const c of activeCases) {
      const events = await db.select().from(caseEventsTable)
        .where(eq(caseEventsTable.case_id, c.id))
        .orderBy(caseEventsTable.created_at);

      const newExceptions: Array<{
        case_id: string;
        exception_type: string;
        severity: string;
        reason: string;
        recommended_action: string;
        status: string;
      }> = [];

      // Rule 1: Intake incomplete > 2 hours
      if (c.current_status === "INTAKE_STARTED") {
        const intakeStarted = getLatestEventByType(events, "INTAKE_STARTED");
        if (intakeStarted && hoursSince(intakeStarted.created_at) > 2) {
          newExceptions.push({
            case_id: c.id,
            exception_type: "INTAKE_INCOMPLETE",
            severity: "medium",
            reason: "Patient started intake but has not submitted it after 2 hours.",
            recommended_action: "Send intake completion reminder to patient.",
            status: "open",
          });
        }
      }

      // Rule 2: Provider review pending > 12 hours
      if (c.current_status === "PROVIDER_REVIEW_PENDING") {
        const intakeSubmitted = getLatestEventByType(events, "INTAKE_SUBMITTED");
        if (intakeSubmitted && hoursSince(intakeSubmitted.created_at) > 12) {
          newExceptions.push({
            case_id: c.id,
            exception_type: "PROVIDER_REVIEW_DELAY",
            severity: "high",
            reason: "Provider review has not started within 12 hours of intake submission.",
            recommended_action: "Escalate to provider queue and notify ops manager.",
            status: "open",
          });
        }
      }

      // Rule 3: Payment failed
      if (hasEvent(events, "PAYMENT_FAILED")) {
        newExceptions.push({
          case_id: c.id,
          exception_type: "PAYMENT_FAILED",
          severity: "high",
          reason: "Payment failed and case cannot proceed to treatment.",
          recommended_action: "Trigger payment retry workflow and notify patient.",
          status: "open",
        });
      }

      // Rule 4: Pharmacy no update > 24 hours
      if (c.current_status === "RX_SENT_TO_PHARMACY") {
        const rxSent = getLatestEventByType(events, "RX_SENT_TO_PHARMACY");
        if (rxSent && hoursSince(rxSent.created_at) > 24) {
          newExceptions.push({
            case_id: c.id,
            exception_type: "PHARMACY_DELAY",
            severity: "medium",
            reason: "Pharmacy has not provided an update within 24 hours of receiving the prescription.",
            recommended_action: "Contact pharmacy partner for status update.",
            status: "open",
          });
        }
      }

      // Rule 5: Lab result received but no provider action > 6 hours
      if (hasEvent(events, "LAB_RESULT_RECEIVED")) {
        const labReceived = getLatestEventByType(events, "LAB_RESULT_RECEIVED");
        if (labReceived && hoursSince(labReceived.created_at) > 6 && !hasEvent(events, "PROVIDER_REVIEW_STARTED")) {
          newExceptions.push({
            case_id: c.id,
            exception_type: "LAB_REVIEW_PENDING",
            severity: "high",
            reason: "Lab result received but provider has not taken action within 6 hours.",
            recommended_action: "Alert clinical team to review lab results immediately.",
            status: "open",
          });
        }
      }

      // Rule 6: Refill due within 7 days
      if (hasEvent(events, "REFILL_DUE")) {
        const refillDue = getLatestEventByType(events, "REFILL_DUE");
        if (refillDue && hoursSince(refillDue.created_at) < 168 && hoursSince(refillDue.created_at) > 0) {
          newExceptions.push({
            case_id: c.id,
            exception_type: "REFILL_DUE",
            severity: "low",
            reason: "Patient refill is due within 7 days.",
            recommended_action: "Send refill outreach and initiate renewal process.",
            status: "open",
          });
        }
      }

      // Rule 7: Support ticket open > 8 hours
      if (hasEvent(events, "SUPPORT_TICKET_CREATED")) {
        const ticketCreated = getLatestEventByType(events, "SUPPORT_TICKET_CREATED");
        if (ticketCreated && hoursSince(ticketCreated.created_at) > 8) {
          newExceptions.push({
            case_id: c.id,
            exception_type: "SUPPORT_ESCALATION",
            severity: "medium",
            reason: "Support ticket has been open for more than 8 hours without resolution.",
            recommended_action: "Escalate to senior support agent.",
            status: "open",
          });
        }
      }

      // Deduplicate: skip exceptions that already exist (open) for this case
      const existingOpenExceptions = await db.select().from(exceptionsTable)
        .where(and(eq(exceptionsTable.case_id, c.id), eq(exceptionsTable.status, "open")));

      const existingTypes = new Set(existingOpenExceptions.map(e => e.exception_type));

      const toInsert = newExceptions.filter(e => !existingTypes.has(e.exception_type));

      if (toInsert.length > 0) {
        await db.insert(exceptionsTable).values(toInsert);
        totalExceptionsCreated += toInsert.length;
        for (const e of toInsert) {
          exceptionsByType[e.exception_type] = (exceptionsByType[e.exception_type] ?? 0) + 1;
        }
      }
    }

    res.json({
      cases_scanned: activeCases.length,
      exceptions_created: totalExceptionsCreated,
      exceptions_by_type: exceptionsByType,
    });
  } catch (err) {
    req.log.error({ err }, "Error running exception scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
