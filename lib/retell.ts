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
 * Strip common spoken prefixes from a user reply so we get just the name.
 * e.g. "Yeah. My name is Mark Webb." → "Mark Webb"
 *      "It's Priya" → "Priya"
 *      "His name is Arjun" → "Arjun"
 */
function stripNamePrefixes(text: string): string {
  return text
    .replace(/[.,!?]/g, "")
    .replace(
      /^(?:yeah|yes|sure|okay|ok|um|uh|so|hi|hello|hey)\s*/gi,
      ""
    )
    .replace(
      /^(?:my name is|i'm|i am|this is|call me|it's|its|it is)\s+/gi,
      ""
    )
    .replace(
      /^(?:(?:his|her|the|my) (?:name is|child'?s? name is|son'?s? name is|daughter'?s? name is))\s+/gi,
      ""
    )
    .trim();
}

/**
 * Extract a name-like value from text.
 * Accepts 1-3 words including single-letter initials (e.g. "T Webb").
 * Filters out filler/common words that voice transcription inserts.
 */
function extractName(text: string): string | null {
  // First strip spoken prefixes like "Yeah. My name is..."
  const cleaned = stripNamePrefixes(text);
  if (!cleaned) return null;

  // Match 1-3 words; allow single letters (for initials like "T") but
  // require at least one word with 2+ chars to avoid pure noise.
  const m = cleaned.match(
    /([a-zA-Z](?:[a-zA-Z]*)(?:\s+[a-zA-Z](?:[a-zA-Z]*)){0,2})/
  );
  if (!m) return null;
  const candidate = m[1];

  // Filter out common filler/stop words
  const filler = new Set([
    "yes", "yeah", "sure", "okay", "ok", "um", "uh", "so", "the",
    "its", "is", "my", "for", "and", "that", "this", "actually",
    "name", "called", "it", "hi", "hello", "hey", "am", "well",
    "just", "like", "please", "thanks", "thank", "you", "can",
    "want", "need", "looking", "would", "will", "about", "have",
  ]);
  const words = candidate
    .split(/\s+/)
    .filter((w) => !filler.has(w.toLowerCase()));
  if (words.length === 0) return null;

  // Require at least one word with 2+ chars (avoid matching just "I" or "a")
  const hasSubstantialWord = words.some((w) => w.length >= 2);
  if (!hasSubstantialWord) return null;

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
        // The user might say "Yeah. My name is Mark Webb." — stripNamePrefixes
        // inside extractName handles this, but also try the explicit pattern
        const nameIsMatch = a.match(/(?:my name is|i'm|i am|this is|call me)\s+(.+)/i);
        parent_name = nameIsMatch
          ? extractName(nameIsMatch[1])
          : extractName(a);
      }

      // Child name — agent asked about child
      if (
        !child_name &&
        (/child'?s? name/.test(q) || /son'?s? name/.test(q) || /daughter'?s? name/.test(q) || /what is (?:his|her) name/.test(q))
      ) {
        // User might say "His name is Arjun" or just "Arjun"
        const childIsMatch = a.match(/(?:(?:his|her|the|my)\s+)?name is\s+(.+)/i);
        child_name = childIsMatch
          ? extractName(childIsMatch[1])
          : extractName(a);
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

      // Email correction — agent confirms email, user says yes/right/correct
      // Override any previously extracted email with the agent's confirmed version
      if (parent_email && userReply.role === "user") {
        const userConfirm = a.toLowerCase().trim();
        const isConfirmation = /^(?:yes|yeah|yep|right|correct|that'?s?\s+(?:right|correct|it)|yup)/.test(userConfirm);
        if (isConfirmation) {
          // Check if the previous agent turn contains a standard email address
          const agentEmail = agentTurn.content.match(
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
          );
          if (agentEmail) {
            parent_email = agentEmail[0].toLowerCase();
          }
        }
      }

      // Grade — agent ASKED about grade (must be a question, not just mentioning grade)
      // Only trigger when the agent is clearly asking which grade the parent wants.
      // Do NOT trigger on informational statements like "seats available in Grade 5".
      // Skip questions about CURRENT grade ("currently in", "right now").
      const isGradeQuestion =
        /which (?:grade|class|level)/.test(q) ||
        /what (?:grade|class|level)/.test(q) ||
        /(?:grade|class).*(?:interested|looking|applying|want|prefer)/.test(q) ||
        /looking (?:at|for).*(?:grade|class)/.test(q);

      if (
        !grade_interested &&
        isGradeQuestion &&
        !/currently/.test(q) && !/right now/.test(q) && !/at the moment/.test(q)
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
          // Number words AND ordinals: "five" / "fifth" → "5"
          const numberWords: Record<string, string> = {
            one: "1", first: "1",
            two: "2", second: "2",
            three: "3", third: "3",
            four: "4", fourth: "4",
            five: "5", fifth: "5",
            six: "6", sixth: "6",
            seven: "7", seventh: "7",
            eight: "8", eighth: "8",
            nine: "9", ninth: "9",
            ten: "10", tenth: "10",
            eleven: "11", eleventh: "11",
            twelve: "12", twelfth: "12",
          };
          for (const [word, num] of Object.entries(numberWords)) {
            // Use word boundary to avoid matching "ten" inside "Anthony" etc.
            const wordRegex = new RegExp(`\\b${word}\\b`);
            if (wordRegex.test(al)) {
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

      // Grade confirmation — agent says "Grade X for [child]" or "availability for Grade X"
      // and user confirms with yes/okay/ok
      if (
        !grade_interested &&
        agentTurn.role === "agent" &&
        userReply.role === "user"
      ) {
        const userConfirm = a.toLowerCase().trim();
        const isConfirmation = /^(?:yes|yeah|yep|right|correct|ok|okay|sure|that'?s?\s+(?:right|correct|it)|yup)/.test(userConfirm);
        if (isConfirmation) {
          // Match "Grade 5 for you", "Grade 5 for [child]", "in Grade 5", "availability for Grade 5"
          const gradeConfirm = agentTurn.content.match(/(?:grade|class)\s+(\d{1,2})/i);
          if (gradeConfirm) {
            grade_interested = gradeConfirm[1];
          }
        }
      }
    }

    // Post-loop: find the LAST properly formatted email in any agent turn.
    // The agent's final mention is the most reliable (after all corrections).
    let lastAgentEmail: string | null = null;
    for (const turn of transcriptObject) {
      if (turn.role === "agent") {
        const emails = turn.content.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        );
        if (emails) {
          lastAgentEmail = emails[emails.length - 1].toLowerCase();
        }
      }
    }
    if (lastAgentEmail) {
      parent_email = lastAgentEmail;
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
    // Find ALL standard email addresses in the transcript and use the LAST one.
    // The last one is typically the agent's final confirmed version after corrections.
    const allEmails = transcript.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    );
    if (allEmails && allEmails.length > 0) {
      parent_email = allEmails[allEmails.length - 1].toLowerCase();
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
    // Prefer grade from agent's confirmation ("Grade 5 for Mark", "seat availability in Grade 5")
    // over the user's mention (which might be their current grade)
    const agentGradeConfirm = transcript.match(
      /Agent:.*?(?:grade|class)\s+(\d{1,2})\s+(?:for|next\s+year|upcoming)/im
    );
    if (agentGradeConfirm) {
      grade_interested = agentGradeConfirm[1];
    } else {
      // Fallback: look for "availability for grade X" or "interested in grade X" from user
      const userGrade = tl.match(/(?:availability\s+(?:for|in)|interested\s+in|looking\s+(?:for|at))\s+(?:grade|class)?\s*(\d{1,2})/);
      if (userGrade) {
        grade_interested = userGrade[1];
      } else {
        // Last resort: first "grade N" mention
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
    }
  }

  return { parent_name, child_name, parent_email, grade_interested };
}
