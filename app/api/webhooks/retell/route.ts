import { NextRequest, NextResponse } from "next/server";
import {
  type RetellWebhookPayload,
  extractCallerInfoFromTranscript,
} from "@/lib/retell";
import { addLead, findLeadByPhone, updateLead } from "@/lib/store";
import { Lead } from "@/lib/types";
import { Resend } from "resend";

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
  const hasVisit = lead.status === "visit_booked" && lead.visit_date;

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
    ? `Visit Confirmed — ${childName}, Grade ${grade} on ${visitDateFormatted}`
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
      `  Date: ${visitDateFormatted}`,
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
            console.log("[Retell] Enriched existing lead:", existing.id);

            // Send post-call email
            const enrichedLead = { ...existing, ...updates };
            await sendPostCallEmail(enrichedLead as Lead, summary);
          } else {
            // Agent didn't call create-lead — build lead from transcript + phone
            const newLead: Lead = {
              id: `lead_retell_${Date.now().toString(36)}`,
              parent_name: extracted?.parent_name || "",
              parent_email: extracted?.parent_email || "",
              parent_phone: call.from_number,
              child_name: extracted?.child_name || "",
              child_dob: null,
              grade_interested: extracted?.grade_interested || "",
              current_school: null,
              status: "new",
              interest_level:
                extracted?.parent_name || extracted?.child_name
                  ? "warm"
                  : "cold",
              visit_date: null,
              visit_time: null,
              application_started: false,
              application_progress: 0,
              conversation_summary:
                summary || transcript.slice(0, 500) || "Inbound call via Retell AI",
              created_at: now,
              updated_at: now,
              follow_ups_sent: [],
            };
            addLead(newLead);
            console.log("[Retell] Created lead from transcript:", newLead.id);

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
