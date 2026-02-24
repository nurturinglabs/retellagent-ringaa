import Retell from "retell-sdk";

const retell = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

export { retell };

export function verifyRetellWebhookSignature(
  body: string,
  apiKey: string,
  signature: string
): boolean {
  try {
    return Retell.verify(body, apiKey, signature);
  } catch (error) {
    console.error("[Retell] Webhook signature verification error:", error);
    return false;
  }
}

export async function getCallDetails(callId: string) {
  return retell.call.retrieve(callId);
}

export async function getAgentDetails(agentId: string) {
  return retell.agent.retrieve(agentId);
}

// Type definitions for Retell webhook payloads
export interface RetellCallData {
  call_id: string;
  from_number?: string;
  to_number?: string;
  agent_id: string;
  call_status?: string;
  transcript?: string;
  transcript_object?: Array<{
    role: "agent" | "user";
    content: string;
  }>;
  recording_url?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    custom_analysis_data?: Record<string, unknown>;
  };
  call_type?: "phone_call" | "web_call";
  disconnection_reason?: string;
}

export interface RetellWebhookPayload {
  event: "call_started" | "call_ended" | "call_analyzed";
  call: RetellCallData;
}

// ── Transcript parsing ──────────────────────────────────────

export interface ExtractedCallerInfo {
  parent_name: string | null;
  child_name: string | null;
  parent_email: string | null;
  grade_interested: string | null;
}

/**
 * Best-effort extraction of caller details from a plain-text transcript.
 * Voice transcripts are messy — this catches the common patterns and is
 * deliberately lenient. The primary source of truth is the create-lead
 * tool call; this is the fallback for short / incomplete calls.
 */
export function extractCallerInfoFromTranscript(
  transcript: string
): ExtractedCallerInfo {
  const t = transcript; // keep original case for names
  const tl = transcript.toLowerCase();

  // ── Parent name ──
  // "my name is John Smith", "I'm Priya Sharma", "this is Kavitha Menon"
  let parent_name: string | null = null;
  const namePatterns = [
    /my name is ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
    /(?:i'm|i am) ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
    /this is ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
    /call me ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
  ];
  for (const re of namePatterns) {
    const m = t.match(re);
    if (m) {
      parent_name = m[1].trim();
      break;
    }
  }

  // ── Child name ──
  // "my child's name is Riya", "my son Arnav", "my daughter Ananya",
  // "child name is Riya", "for my child Riya"
  let child_name: string | null = null;
  const childPatterns = [
    /(?:child(?:'s)? name is|kid(?:'s)? name is) ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
    /(?:my son|my daughter|my child|my kid) (?:is )?([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
    /(?:son's|daughter's) name is ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
    /(?:his|her) name is ([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})/,
  ];
  for (const re of childPatterns) {
    const m = t.match(re);
    if (m) {
      child_name = m[1].trim();
      break;
    }
  }

  // ── Email ──
  // Match anything that looks like an email in the transcript
  let parent_email: string | null = null;
  const emailMatch = t.match(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
  );
  if (emailMatch) {
    parent_email = emailMatch[0].toLowerCase();
  }

  // ── Grade ──
  // "grade 5", "Grade 11", "nursery", "LKG", "UKG", "class 3"
  let grade_interested: string | null = null;
  const gradeMatch = tl.match(
    /(?:grade|class)\s+(\d{1,2})/
  );
  if (gradeMatch) {
    grade_interested = gradeMatch[1];
  } else if (/\bnursery\b/.test(tl)) {
    grade_interested = "Nursery";
  } else if (/\blkg\b/.test(tl)) {
    grade_interested = "LKG";
  } else if (/\bukg\b/.test(tl)) {
    grade_interested = "UKG";
  }

  return { parent_name, child_name, parent_email, grade_interested };
}
