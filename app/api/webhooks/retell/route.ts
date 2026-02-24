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

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Ringaa Admissions <onboarding@resend.dev>",
      to: OVERRIDE_EMAIL,
      subject: `Thank you for calling Brookfield — ${parentName}`,
      text: [
        `Hi ${parentName},`,
        ``,
        `Thank you for speaking with our admissions assistant about Brookfield International School.`,
        ``,
        `Here's a summary of your call:`,
        `  Parent: ${parentName}`,
        `  Child: ${childName}`,
        `  Grade of Interest: ${grade}`,
        ...(callSummary ? [``, `Call Summary:`, callSummary] : []),
        ``,
        `What you can do next:`,
        `  - Schedule a campus visit (Mon-Fri, 9 AM - 4 PM)`,
        `  - Start an application online`,
        `  - Call us again anytime at +91-80-4567-8900`,
        ``,
        `We look forward to welcoming ${childName} to Brookfield!`,
        ``,
        `Warm regards,`,
        `Brookfield International School — Admissions Office`,
      ].join("\n"),
    });
    console.log("[Retell] Post-call email sent for lead:", lead.id);
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

        // Extract caller info from transcript as fallback data
        const extracted = transcript
          ? extractCallerInfoFromTranscript(transcript)
          : null;

        if (extracted) {
          console.log("[Retell] Extracted from transcript:", extracted);
        }

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
