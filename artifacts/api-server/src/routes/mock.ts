import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, casesTable, caseEventsTable, exceptionsTable, aiCaseSummariesTable, actionsTable } from "@workspace/db/schema";

const router = Router();

const PROGRAMS = ["GLP-1", "HRT", "TRT", "Peptides", "Hair Loss", "Sexual Health"];

const STATUSES = [
  "INTAKE_STARTED",
  "INTAKE_SUBMITTED",
  "PAYMENT_AUTHORIZED",
  "PAYMENT_FAILED",
  "PROVIDER_REVIEW_PENDING",
  "PROVIDER_REVIEW_STARTED",
  "PROVIDER_APPROVED",
  "MISSING_INFO_REQUESTED",
  "RX_SENT_TO_PHARMACY",
  "PHARMACY_ACCEPTED",
  "PHARMACY_DELAYED",
  "LAB_RESULT_RECEIVED",
  "SUPPORT_TICKET_CREATED",
  "CASE_CLOSED",
];

const EVENT_SEQUENCES: Record<string, string[]> = {
  INTAKE_STARTED: ["INTAKE_STARTED"],
  INTAKE_SUBMITTED: ["INTAKE_STARTED", "INTAKE_SUBMITTED"],
  PAYMENT_AUTHORIZED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED"],
  PAYMENT_FAILED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_FAILED"],
  PROVIDER_REVIEW_PENDING: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED"],
  PROVIDER_REVIEW_STARTED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_ASSIGNED", "PROVIDER_REVIEW_STARTED"],
  PROVIDER_APPROVED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_ASSIGNED", "PROVIDER_REVIEW_STARTED", "PROVIDER_APPROVED"],
  MISSING_INFO_REQUESTED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "MISSING_INFO_REQUESTED"],
  RX_SENT_TO_PHARMACY: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_ASSIGNED", "PROVIDER_REVIEW_STARTED", "PROVIDER_APPROVED", "RX_SENT_TO_PHARMACY"],
  PHARMACY_ACCEPTED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_APPROVED", "RX_SENT_TO_PHARMACY", "PHARMACY_ACCEPTED"],
  PHARMACY_DELAYED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_APPROVED", "RX_SENT_TO_PHARMACY", "PHARMACY_DELAYED"],
  LAB_RESULT_RECEIVED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_APPROVED", "LAB_RESULT_RECEIVED"],
  SUPPORT_TICKET_CREATED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "SUPPORT_TICKET_CREATED"],
  CASE_CLOSED: ["INTAKE_STARTED", "INTAKE_SUBMITTED", "PAYMENT_AUTHORIZED", "PROVIDER_APPROVED", "RX_SENT_TO_PHARMACY", "PHARMACY_ACCEPTED", "CASE_CLOSED"],
};

const FIRST_NAMES = ["Sarah", "Michael", "Jennifer", "David", "Emily", "James", "Amanda", "Robert", "Jessica", "William", "Ashley", "Christopher", "Stephanie", "Matthew", "Nicole", "Daniel", "Lauren", "Anthony", "Megan", "Mark", "Rachel", "Steven", "Brittany", "Kevin", "Samantha"];
const LAST_NAMES = ["Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Lewis", "Robinson", "Walker", "Young"];
const STATES = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA", "TN", "IN", "MO", "MD", "WI"];
const PROVIDERS = ["Dr. Smith", "Dr. Johnson", "Dr. Williams", "Dr. Brown", "Dr. Davis", "Dr. Miller", "Dr. Wilson", "Dr. Moore"];

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

router.post("/mock/seed", async (req, res) => {
  try {
    // Clear existing data
    await db.delete(actionsTable);
    await db.delete(aiCaseSummariesTable);
    await db.delete(exceptionsTable);
    await db.delete(caseEventsTable);
    await db.delete(casesTable);
    await db.delete(patientsTable);

    const patientData = FIRST_NAMES.map((firstName, i) => ({
      first_name: firstName,
      last_name: LAST_NAMES[i],
      email: `${firstName.toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@email.com`,
      phone: `+1${randomBetween(200, 999)}${randomBetween(100, 999)}${randomBetween(1000, 9999)}`,
      state: pick(STATES),
    }));

    const patients = await db.insert(patientsTable).values(patientData).returning();

    const caseStatuses = [
      "INTAKE_STARTED", "INTAKE_STARTED",
      "PAYMENT_FAILED", "PAYMENT_FAILED",
      "PROVIDER_REVIEW_PENDING", "PROVIDER_REVIEW_PENDING", "PROVIDER_REVIEW_PENDING",
      "MISSING_INFO_REQUESTED", "MISSING_INFO_REQUESTED",
      "PHARMACY_DELAYED", "PHARMACY_DELAYED",
      "LAB_RESULT_RECEIVED",
      "SUPPORT_TICKET_CREATED",
      "RX_SENT_TO_PHARMACY", "RX_SENT_TO_PHARMACY",
      "PROVIDER_REVIEW_STARTED",
      "PROVIDER_APPROVED",
      "PHARMACY_ACCEPTED",
      "INTAKE_SUBMITTED",
      "PAYMENT_AUTHORIZED",
      "PROVIDER_APPROVED",
      "RX_SENT_TO_PHARMACY",
      "PROVIDER_REVIEW_PENDING",
      "PAYMENT_FAILED",
      "CASE_CLOSED",
    ];

    const priorities = ["high", "high", "normal", "normal", "normal", "normal", "low", "low"];

    let totalEvents = 0;
    const createdCases = [];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const status = caseStatuses[i] ?? pick(STATUSES);
      const program = pick(PROGRAMS);
      const priority = pick(priorities);
      const hoursOld = randomBetween(2, 72);

      const [newCase] = await db.insert(casesTable).values({
        patient_id: patient.id,
        program_type: program,
        current_status: status,
        assigned_provider: status !== "INTAKE_STARTED" && status !== "INTAKE_SUBMITTED" ? pick(PROVIDERS) : null,
        assigned_ops_owner: Math.random() > 0.5 ? "ops-team@clinic.com" : null,
        priority,
        updated_at: hoursAgo(hoursOld),
      }).returning();

      createdCases.push(newCase);

      const eventTypes = EVENT_SEQUENCES[status] ?? [status];
      const eventSpacing = hoursOld / eventTypes.length;

      for (let j = 0; j < eventTypes.length; j++) {
        const eventHoursAgo = hoursOld - j * eventSpacing;
        const payload: Record<string, unknown> = {};

        if (eventTypes[j] === "PAYMENT_FAILED") {
          payload.reason = "Card declined";
          payload.amount = randomBetween(150, 500);
        } else if (eventTypes[j] === "MISSING_INFO_REQUESTED") {
          payload.field = "contraindication_question";
        } else if (eventTypes[j] === "PROVIDER_ASSIGNED") {
          payload.provider = pick(PROVIDERS);
        } else if (eventTypes[j] === "LAB_RESULT_RECEIVED") {
          payload.lab_type = "bloodwork";
          payload.result = "pending_review";
        }

        await db.insert(caseEventsTable).values({
          case_id: newCase.id,
          event_type: eventTypes[j],
          payload: Object.keys(payload).length > 0 ? payload : null,
          created_at: hoursAgo(eventHoursAgo),
        });
        totalEvents++;
      }
    }

    res.json({
      patients_created: patients.length,
      cases_created: createdCases.length,
      events_created: totalEvents,
      message: `Successfully seeded ${patients.length} patients and ${createdCases.length} cases. Run exception scan to detect issues.`,
    });
  } catch (err) {
    req.log.error({ err }, "Error seeding mock data");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
