import { NextRequest, NextResponse } from "next/server";
import {
  type RetellWebhookPayload,
  extractCallerInfoFromTranscript,
} from "@/lib/retell";
import { addLead, findLeadByPhone, getLeadById, updateLead } from "@/lib/store";
import { Lead } from "@/lib/types";
import { Resend } from "resend";
import * as chrono from "chrono-node";

const OVERRIDE_EMAIL = "nurturinglabs@gmail.com";

// In-memory store for Retell calls (demo — resets on cold start)
const retellCalls: Array<{
  call_id: string;
  phone_number: string;
  transcript: string | null;
  duration: number;
  sentiment: string | null;
  summary: string | null;
  recording_url: string | null;
  created_at: string;
}> = [];

export function getRetellCalls() {
  return retellCalls;
}

// ── Detect visit from transcript/summary ────────────────────

function detectVisitFromTranscript(
  transcript: string,
  summary: string | null
): { visitDetected: boolean; visitDate: string | null; visitTime: string | null } {
  const text = `${summary || ""} ${transcript}`.toLowerCase();

  // Check if a visit was discussed/confirmed in the conversation
  const visitKeywords = /visit\s+(?:is\s+)?(?:booked|confirmed|scheduled|set)|campus\s+visit.*(?:booked|confirmed|scheduled)|(?:booked|confirmed|scheduled)\s+(?:a\s+)?(?:campus\s+)?visit|see you (?:on|at|tomorrow|next)|i've\s+(?:got|booked)\s+your\s+(?:campus\s+)?visit/i;
  const visitDetected = visitKeywords.test(text);

  if (!visitDetected) return { visitDetected: false, visitDate: null, visitTime: null };

  // Try to extract a date from the transcript using multiple strategies
  let visitDate: string | null = null;
  let visitTime: string | null = null;

  // Strategy 1: Look for date near visit-related context (single-line match)
  const datePatterns = [
    /visit\s+(?:for|on|scheduled\s+for)\s+(.+?)(?:\.|,|!|\?|\n|$)/im,
    /(?:booked|confirmed|scheduled)\s+.*?(?:for|on)\s+(.+?)(?:\.|,|!|\?|\n|$)/im,
    /(?:visit|see you)\s+.*?(tomorrow|next\s+\w+day|monday|tuesday|wednesday|thursday|friday)/im,
  ];

  for (const pattern of datePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const parsed = chrono.parseDate(match[1], new Date(), { forwardDate: true });
      if (parsed) {
        visitDate = parsed.toISOString().split("T")[0];
        console.log("[Retell] Date extracted via pattern:", match[1], "→", visitDate);
        break;
      }
    }
  }

  // Strategy 2: Fallback — let chrono scan the full transcript for any date
  // near visit-related sentences
  if (!visitDate) {
    const visitSentences = transcript.match(
      /[^.!?\n]*(?:visit|campus tour|see you)[^.!?\n]*/gi
    );
    if (visitSentences) {
      for (const sentence of visitSentences) {
        const parsed = chrono.parseDate(sentence, new Date(), { forwardDate: true });
        if (parsed) {
          visitDate = parsed.toISOString().split("T")[0];
          console.log("[Retell] Date extracted via sentence scan:", sentence.trim().slice(0, 80), "→", visitDate);
          break;
        }
      }
    }
  }

  // Strategy 3: If summary mentions a date, try that
  if (!visitDate && summary) {
    const parsed = chrono.parseDate(summary, new Date(), { forwardDate: true });
    if (parsed) {
      visitDate = parsed.toISOString().split("T")[0];
      console.log("[Retell] Date extracted from summary →", visitDate);
    }
  }

  // Extract time
  const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))/i);
  if (timeMatch) {
    visitTime = timeMatch[1].toUpperCase().replace(/\./g, "");
  }

  console.log("[Retell] detectVisitFromTranscript result:", JSON.stringify({ visitDetected, visitDate, visitTime }));
  return { visitDetected, visitDate, visitTime };
}

// ── Send post-call email ────────────────────────────────────

async function sendPostCallEmail(lead: Lead, callSummary: string | null) {
  if (
    !process.env.RESEND_API_KEY ||
    process.env.RESEND_API_KEY === "your_resend_api_key_here"
  ) {
    console.log("[Retell] Skipping email — RESEND_API_KEY not configured");
    return;
  }

  const parentName = lead.parent_name || "Parent";
  const childName = lead.child_name || "your child";
  const grade = lead.grade_interested || "the grade you mentioned";
  // Visit is confirmed if status is visit_booked (date is optional — may not always be extracted)
  const hasVisit = lead.status === "visit_booked";

  // Format visit date nicely if present
  let visitDateFormatted = "";
  if (lead.visit_date) {
    try {
      visitDateFormatted = new Date(lead.visit_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      visitDateFormatted = lead.visit_date;
    }
  }

  const subject = hasVisit
    ? visitDateFormatted
      ? `Visit Confirmed — ${childName}, Grade ${grade} on ${visitDateFormatted}`
      : `Visit Confirmed — ${childName}, Grade ${grade}`
    : `Thank you for calling Brookfield — ${parentName}`;

  // Build email body based on whether a visit was booked
  const lines: string[] = [
    `Hi ${parentName},`,
    ``,
  ];

  if (hasVisit) {
    lines.push(
      `Your campus visit to Brookfield International School has been confirmed.`,
      ``,
      `Visit Details:`,
      `  Child: ${childName}`,
      `  Grade: ${grade}`,
    );
    if (visitDateFormatted) {
      lines.push(`  Date: ${visitDateFormatted}`);
    }
    lines.push(
      `  Time: ${lead.visit_time || "10:00 AM"}`,
      ``,
      `What to bring:`,
      `  - Valid photo ID`,
      `  - Child's previous report card (if available)`,
      ``,
      `Location: Brookfield International School, Whitefield, Bangalore`,
      ``,
      `If you need to reschedule, please call us at +91-80-4567-8900.`,
    );
  } else {
    lines.push(
      `Thank you for speaking with our admissions assistant about Brookfield International School.`,
      ``,
      `Here's a summary of your call:`,
      `  Parent: ${parentName}`,
      `  Child: ${childName}`,
      `  Grade of Interest: ${grade}`,
    );

    if (callSummary) {
      lines.push(``, `Call Summary:`, callSummary);
    }

    lines.push(
      ``,
      `What you can do next:`,
      `  - Schedule a campus visit (Mon-Fri, 9 AM - 4 PM)`,
      `  - Start an application online`,
      `  - Call us again anytime at +91-80-4567-8900`,
    );
  }

  lines.push(
    ``,
    `We look forward to welcoming ${childName} to Brookfield!`,
    ``,
    `Warm regards,`,
    `Brookfield International School — Admissions Office`,
  );

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Ringaa Admissions <onboarding@resend.dev>",
      to: OVERRIDE_EMAIL,
      subject,
      text: lines.join("\n"),
    });
    console.log("[Retell] Post-call email sent for lead:", lead.id, "| visit:", !!hasVisit);
  } catch (err) {
    console.error("[Retell] Failed to send post-call email:", err);
  }
}

// ── Webhook handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // TODO: Re-enable signature verification after testing
    // See lib/retell.ts verifyRetellWebhookSignature()
    console.warn(
      "WARNING: Webhook signature verification is disabled for testing"
    );

    const payload = JSON.parse(body) as RetellWebhookPayload;
    const { event, call } = payload;

    // ── DEBUG: Log the full webhook payload ──
    console.log("[Retell] ===== WEBHOOK EVENT:", event, "=====");
    console.log("[Retell] Call ID:", call.call_id);
    console.log("[Retell] From:", call.from_number);
    if (call.transcript) {
      console.log("[Retell] FULL TRANSCRIPT:", call.transcript);
    }
    if (call.transcript_object) {
      console.log("[Retell] TRANSCRIPT TURNS:", JSON.stringify(call.transcript_object));
    }
    if (call.call_analysis) {
      console.log("[Retell] CALL ANALYSIS:", JSON.stringify(call.call_analysis));
    }
    // ── END DEBUG ──

    switch (event) {
      case "call_started":
        console.log("[Retell] Call started:", call.call_id);
        break;

      case "call_ended": {
        console.log("[Retell] Call ended:", call.call_id);

        const transcript = call.transcript || "";
        const summary = call.call_analysis?.call_summary || null;

        // Save call record
        retellCalls.push({
          call_id: call.call_id,
          phone_number: call.from_number || "Unknown",
          transcript: transcript || null,
          duration: call.duration_ms
            ? Math.round(call.duration_ms / 1000)
            : 0,
          sentiment: call.call_analysis?.user_sentiment || null,
          summary,
          recording_url: call.recording_url || null,
          created_at: new Date().toISOString(),
        });

        // Extract caller info from structured turns or flat transcript
        const extracted = transcript || call.transcript_object
          ? extractCallerInfoFromTranscript(transcript, call.transcript_object ?? undefined)
          : null;

        console.log("[Retell] Extracted fields:", JSON.stringify(extracted));

        if (call.from_number) {
          const existing = findLeadByPhone(call.from_number);
          const now = new Date().toISOString();

          if (existing) {
            // Lead was already created by /api/create-lead during the call.
            // Fill in any blanks from transcript extraction and attach summary.
            const updates: Partial<Lead> = {
              conversation_summary: summary || existing.conversation_summary,
              updated_at: now,
            };

            if (extracted) {
              if (!existing.parent_name && extracted.parent_name)
                updates.parent_name = extracted.parent_name;
              if (!existing.child_name && extracted.child_name)
                updates.child_name = extracted.child_name;
              if (!existing.parent_email && extracted.parent_email)
                updates.parent_email = extracted.parent_email;
              if (!existing.grade_interested && extracted.grade_interested)
                updates.grade_interested = extracted.grade_interested;
            }

            updateLead(existing.id, updates);

            // Re-read from store to get the absolute latest state
            // (includes visit_booked status if /api/book-visit was called during the call)
            let latestLead = getLeadById(existing.id);
            console.log("[Retell] Lead after enrich:", existing.id, "| status:", latestLead?.status, "| visit:", latestLead?.visit_date);

            // If the lead isn't marked as visit_booked yet, check the transcript
            // for visit-related keywords. The agent may have booked a visit verbally
            // or the book_visit tool response may not have updated this lead.
            if (latestLead && latestLead.status !== "visit_booked") {
              const visitInfo = detectVisitFromTranscript(transcript, summary);
              console.log("[Retell] Visit detection from transcript:", JSON.stringify(visitInfo));

              if (visitInfo.visitDetected) {
                updateLead(existing.id, {
                  status: "visit_booked",
                  visit_date: visitInfo.visitDate || latestLead.visit_date,
                  visit_time: visitInfo.visitTime || latestLead.visit_time || "10:00 AM",
                  updated_at: now,
                });
                latestLead = getLeadById(existing.id);
                console.log("[Retell] Updated lead to visit_booked from transcript detection");
              }
            }

            if (latestLead) {
              await sendPostCallEmail(latestLead, summary);
            }
          } else {
            // Agent didn't call create-lead — build lead from transcript + phone
            const visitInfo = detectVisitFromTranscript(transcript, summary);
            const newLead: Lead = {
              id: `lead_retell_${Date.now().toString(36)}`,
              parent_name: extracted?.parent_name || "",
              parent_email: extracted?.parent_email || "",
              parent_phone: call.from_number,
              child_name: extracted?.child_name || "",
              child_dob: null,
              grade_interested: extracted?.grade_interested || "",
              current_school: null,
              status: visitInfo.visitDetected ? "visit_booked" : "new",
              interest_level:
                extracted?.parent_name || extracted?.child_name
                  ? "warm"
                  : "cold",
              visit_date: visitInfo.visitDate,
              visit_time: visitInfo.visitTime || "10:00 AM",
              application_started: false,
              application_progress: 0,
              conversation_summary:
                summary || transcript.slice(0, 500) || "Inbound call via Retell AI",
              created_at: now,
              updated_at: now,
              follow_ups_sent: [],
            };
            addLead(newLead);
            console.log("[Retell] Created lead from transcript:", newLead.id,
              "| status:", newLead.status,
              "| visit_date:", newLead.visit_date,
              "| visit_time:", newLead.visit_time);

            // Send post-call email
            await sendPostCallEmail(newLead, summary);
          }
        }
        break;
      }

      case "call_analyzed": {
        console.log("[Retell] Call analyzed:", call.call_id);

        // Update call record with analysis
        const existingCall = retellCalls.find(
          (c) => c.call_id === call.call_id
        );
        if (existingCall) {
          existingCall.sentiment =
            call.call_analysis?.user_sentiment || existingCall.sentiment;
          existingCall.summary =
            call.call_analysis?.call_summary || existingCall.summary;
        }

        // Update lead summary with the better analyzed version
        if (call.from_number && call.call_analysis?.call_summary) {
          const lead = findLeadByPhone(call.from_number);
          if (lead) {
            updateLead(lead.id, {
              conversation_summary: call.call_analysis.call_summary,
              updated_at: new Date().toISOString(),
            });
          }
        }
        break;
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Retell Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
