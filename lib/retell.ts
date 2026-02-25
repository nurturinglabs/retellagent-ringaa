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

/** Capitalize first letter of each word: "john smith" → "John Smith" */
function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extract a name-like value from text: 1-3 words, each at least 2 chars.
 * Filters out filler words that voice transcription commonly inserts.
 */
function extractName(text: string): string | null {
  const cleaned = text
    .replace(/[.,!?]/g, "")
    .trim();
  // Take the first 1-3 consecutive words that look like a name
  const m = cleaned.match(/([a-zA-Z]{2,}(?:\s+[a-zA-Z]{2,}){0,2})/);
  if (!m) return null;
  const name = m[1];
  // Filter out common filler
  const filler = new Set([
    "yes", "yeah", "sure", "okay", "ok", "um", "uh", "so", "the",
    "its", "is", "my", "for", "and", "that", "this", "actually",
  ]);
  const words = name.split(/\s+/).filter((w) => !filler.has(w.toLowerCase()));
  if (words.length === 0) return null;
  return titleCase(words.join(" "));
}

/**
 * Extract caller info from structured transcript turns or plain text.
 *
 * Strategy: When we have transcript_object, look at user replies that
 * immediately follow agent questions like "what is your name?". This is
 * much more reliable than regex on a flat string because the user's
 * answer to "what is your child's name?" is just the name itself.
 *
 * Falls back to flat-text regex when transcript_object is not available.
 */
export function extractCallerInfoFromTranscript(
  transcript: string,
  transcriptObject?: Array<{ role: "agent" | "user"; content: string }>
): ExtractedCallerInfo {
  let parent_name: string | null = null;
  let child_name: string | null = null;
  let parent_email: string | null = null;
  let grade_interested: string | null = null;

  // ── Strategy 1: Parse structured transcript_object ──
  if (transcriptObject && transcriptObject.length > 1) {
    for (let i = 0; i < transcriptObject.length - 1; i++) {
      const agentTurn = transcriptObject[i];
      const userReply = transcriptObject[i + 1];

      if (agentTurn.role !== "agent" || userReply.role !== "user") continue;

      const q = agentTurn.content.toLowerCase();
      const a = userReply.content;

      // Parent name — agent asked about their name
      if (
        !parent_name &&
        (/your name/.test(q) || /may i (?:know|get|have) your/.test(q) || /who am i speaking/.test(q))
      ) {
        parent_name = extractName(a);
      }

      // Child name — agent asked about child
      if (
        !child_name &&
        (/child'?s? name/.test(q) || /son'?s? name/.test(q) || /daughter'?s? name/.test(q) || /what is (?:his|her) name/.test(q))
      ) {
        child_name = extractName(a);
      }

      // Email — agent asked for email
      if (!parent_email && /email/.test(q)) {
        const emailMatch = a.match(
          /[a-zA-Z0-9._%+-]+\s*(?:@|at)\s*[a-zA-Z0-9.-]+\s*(?:\.|dot)\s*[a-zA-Z]{2,}/i
        );
        if (emailMatch) {
          // Normalize spoken email: "john at gmail dot com" → "john@gmail.com"
          parent_email = emailMatch[0]
            .replace(/\s*at\s*/gi, "@")
            .replace(/\s*dot\s*/gi, ".")
            .replace(/\s+/g, "")
            .toLowerCase();
        } else {
          // Try standard email pattern
          const stdMatch = a.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
          );
          if (stdMatch) parent_email = stdMatch[0].toLowerCase();
        }
      }

      // Grade — agent asked about grade
      if (
        !grade_interested &&
        (/grade/.test(q) || /class/.test(q) || /which (?:grade|class|level)/.test(q) || /looking at/.test(q))
      ) {
        const al = a.toLowerCase();
        const gradeNum = al.match(/(?:grade|class)?\s*(\d{1,2})/);
        if (gradeNum) {
          grade_interested = gradeNum[1];
        } else if (/nursery/.test(al)) {
          grade_interested = "Nursery";
        } else if (/\blkg\b|l ?k ?g|lower\s*kg/.test(al)) {
          grade_interested = "LKG";
        } else if (/\bukg\b|u ?k ?g|upper\s*kg/.test(al)) {
          grade_interested = "UKG";
        } else if (/pre[\s-]*primary|pre[\s-]*school/.test(al)) {
          grade_interested = "Nursery";
        } else {
          // Just a number like "5" or "five"
          const numberWords: Record<string, string> = {
            one: "1", two: "2", three: "3", four: "4", five: "5",
            six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
            eleven: "11", twelve: "12",
          };
          for (const [word, num] of Object.entries(numberWords)) {
            if (al.includes(word)) {
              grade_interested = num;
              break;
            }
          }
          if (!grade_interested) {
            const justNum = al.match(/^\s*(\d{1,2})\s*$/);
            if (justNum) grade_interested = justNum[1];
          }
        }
      }
    }
  }

  // ── Strategy 2: Flat text regex fallback (case-insensitive) ──
  const tl = transcript.toLowerCase();

  if (!parent_name) {
    const namePatterns = [
      /my name is (.+?)(?:\.|,|$)/i,
      /(?:i'm|i am) (.+?)(?:\.|,|\s+and\b|\s+i\b|$)/i,
      /(?:this is|call me) (.+?)(?:\.|,|$)/i,
    ];
    for (const re of namePatterns) {
      const m = transcript.match(re);
      if (m) {
        parent_name = extractName(m[1]);
        if (parent_name) break;
      }
    }
  }

  if (!child_name) {
    const childPatterns = [
      /(?:child'?s? name is|kid'?s? name is) (.+?)(?:\.|,|$)/i,
      /(?:my (?:son|daughter|child|kid)) (?:is )?(.+?)(?:\.|,|$)/i,
      /(?:(?:son|daughter)'?s? name is) (.+?)(?:\.|,|$)/i,
      /(?:his|her) name is (.+?)(?:\.|,|$)/i,
    ];
    for (const re of childPatterns) {
      const m = transcript.match(re);
      if (m) {
        child_name = extractName(m[1]);
        if (child_name) break;
      }
    }
  }

  if (!parent_email) {
    // Standard email
    const emailMatch = transcript.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    if (emailMatch) {
      parent_email = emailMatch[0].toLowerCase();
    } else {
      // Spoken email: "john at gmail dot com"
      const spokenMatch = transcript.match(
        /([a-zA-Z0-9._%+-]+)\s+at\s+([a-zA-Z0-9.-]+)\s+dot\s+([a-zA-Z]{2,})/i
      );
      if (spokenMatch) {
        parent_email = `${spokenMatch[1]}@${spokenMatch[2]}.${spokenMatch[3]}`.toLowerCase();
      }
    }
  }

  if (!grade_interested) {
    const gradeMatch = tl.match(/(?:grade|class)\s+(\d{1,2})/);
    if (gradeMatch) {
      grade_interested = gradeMatch[1];
    } else if (/\bnursery\b/.test(tl)) {
      grade_interested = "Nursery";
    } else if (/\blkg\b|l\.?k\.?g/.test(tl)) {
      grade_interested = "LKG";
    } else if (/\bukg\b|u\.?k\.?g/.test(tl)) {
      grade_interested = "UKG";
    }
  }

  return { parent_name, child_name, parent_email, grade_interested };
}
