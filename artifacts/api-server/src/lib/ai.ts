import { logger } from "./logger";

interface CaseInput {
  program_type: string;
  state: string;
  current_status: string;
  events: Array<{
    type: string;
    created_at: string;
    payload?: unknown;
  }>;
}

interface AiAnalysisResult {
  summary: string;
  risk_level: string;
  reason_stuck: string;
  recommended_action: string;
  draft_message: string;
}

const STATUS_ANALYSIS: Record<string, { reason: string; action: string; risk: string; message: string }> = {
  INTAKE_STARTED: {
    reason: "Patient started intake but has not submitted it. The intake form may be incomplete or the patient has not returned.",
    action: "Send an intake completion reminder to the patient via SMS or email.",
    risk: "medium",
    message: "Hi, we noticed you started your health intake but haven't finished. It only takes a few minutes to complete. Please click here to continue: [link].",
  },
  PAYMENT_FAILED: {
    reason: "Payment authorization failed, blocking case progression to provider review.",
    action: "Trigger payment retry workflow and notify patient to update payment method.",
    risk: "high",
    message: "Hi, we had trouble processing your payment. Please update your payment method to continue your treatment: [link].",
  },
  PROVIDER_REVIEW_PENDING: {
    reason: "Intake is complete and payment authorized, but no provider has been assigned or started review.",
    action: "Escalate to provider operations team to assign and queue for review.",
    risk: "high",
    message: "Hi, your case is in our provider queue. We're working to assign your provider. We'll notify you as soon as your review begins.",
  },
  MISSING_INFO_REQUESTED: {
    reason: "Provider flagged missing clinical information that is required before treatment can be approved.",
    action: "Send missing-info reminder to patient and route back to intake completion queue.",
    risk: "medium",
    message: "Hi, your provider needs one more piece of information before approving your treatment. Please complete this short follow-up: [link].",
  },
  RX_SENT_TO_PHARMACY: {
    reason: "Prescription sent to pharmacy but no acknowledgment or status update received within expected window.",
    action: "Contact pharmacy partner directly to confirm receipt and get status update.",
    risk: "medium",
    message: "Your prescription has been sent to our pharmacy partner. We're following up to confirm they've received it and will update you shortly.",
  },
  PHARMACY_DELAYED: {
    reason: "Pharmacy received the prescription but has not provided a fulfillment update or tracking number.",
    action: "Escalate to pharmacy partner account manager and offer patient an alternative fulfillment option.",
    risk: "high",
    message: "Hi, we're seeing a delay with your prescription at our pharmacy partner. We're actively working to resolve this and will update you within 24 hours.",
  },
  LAB_RESULT_RECEIVED: {
    reason: "Lab results have arrived but no provider has taken action, which may delay treatment approval.",
    action: "Alert clinical team to prioritize lab review and route to assigned provider.",
    risk: "high",
    message: "Your lab results are in. Your provider will review them shortly and reach out with next steps.",
  },
  SUPPORT_TICKET_CREATED: {
    reason: "A support ticket has been open without resolution, creating a negative patient experience.",
    action: "Escalate to senior support agent and prioritize resolution.",
    risk: "medium",
    message: "Hi, we want to make sure your support request gets the attention it deserves. A senior member of our team will follow up with you shortly.",
  },
};

function generateFallbackAnalysis(caseInput: CaseInput): AiAnalysisResult {
  const info = STATUS_ANALYSIS[caseInput.current_status] ?? {
    reason: `Case is currently in ${caseInput.current_status} status with no recent progression.`,
    action: "Review case manually and determine next operational step.",
    risk: "low",
    message: "Hi, our ops team is reviewing your case and will be in touch shortly.",
  };

  const eventCount = caseInput.events.length;
  const latestEvent = caseInput.events[eventCount - 1];

  return {
    summary: `Patient is enrolled in the ${caseInput.program_type} program (${caseInput.state}). Current status: ${caseInput.current_status.replace(/_/g, " ")}. ${eventCount} events recorded. Latest: ${latestEvent?.type?.replace(/_/g, " ") ?? "none"}.`,
    risk_level: info.risk,
    reason_stuck: info.reason,
    recommended_action: info.action,
    draft_message: info.message,
  };
}

async function tryOpenAiAnalysis(caseInput: CaseInput): Promise<AiAnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const prompt = `You are an operations assistant for a telehealth infrastructure platform.

You are NOT making clinical decisions.
You are summarizing workflow status and recommending operational next steps only.

Given the patient case timeline, identify:
1. Current case state
2. Why the case appears stuck
3. Which team owns the next action
4. Urgency level: low, medium, or high
5. Recommended operational action
6. A short draft message if outreach is needed

Avoid medical advice. Do not approve or reject treatment. Do not infer diagnosis.

Return valid JSON only with this exact structure:
{
  "summary": "...",
  "risk_level": "low|medium|high",
  "reason_stuck": "...",
  "recommended_action": "...",
  "draft_message": "..."
}

Input:
${JSON.stringify(caseInput, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as AiAnalysisResult;
  } catch (err) {
    logger.error({ err }, "OpenAI call failed");
    return null;
  }
}

export async function analyzeWithAI(caseInput: CaseInput): Promise<AiAnalysisResult> {
  const aiResult = await tryOpenAiAnalysis(caseInput);
  if (aiResult) return aiResult;

  logger.info("Using rule-based fallback analysis");
  return generateFallbackAnalysis(caseInput);
}
