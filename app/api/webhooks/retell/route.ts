import { NextRequest, NextResponse } from "next/server";
import { type RetellWebhookPayload } from "@/lib/retell";
import { addLead, findLeadByPhone, updateLead } from "@/lib/store";
import { Lead } from "@/lib/types";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // TODO: Re-enable signature verification after testing
    // See lib/retell.ts verifyRetellWebhookSignature()
    console.warn("WARNING: Webhook signature verification is disabled for testing");

    const payload = JSON.parse(body) as RetellWebhookPayload;
    const { event, call } = payload;

    switch (event) {
      case "call_started":
        console.log("[Retell] Call started:", call.call_id);
        break;

      case "call_ended":
        console.log("[Retell] Call ended:", call.call_id);

        // Save call record to in-memory store
        retellCalls.push({
          call_id: call.call_id,
          phone_number: call.from_number || "Unknown",
          transcript: call.transcript || null,
          duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
          sentiment: call.call_analysis?.user_sentiment || null,
          summary: call.call_analysis?.call_summary || null,
          recording_url: call.recording_url || null,
          created_at: new Date().toISOString(),
        });

        // Check if the agent already created a lead via /api/create-lead during the call.
        // If so, just attach the transcript. If not, create a minimal lead from phone number.
        if (call.from_number) {
          const existing = findLeadByPhone(call.from_number);

          if (existing) {
            // Lead was already created by the agent tool — enrich with post-call data
            updateLead(existing.id, {
              conversation_summary:
                call.call_analysis?.call_summary ||
                existing.conversation_summary,
              updated_at: new Date().toISOString(),
            });
            console.log("[Retell] Updated existing lead:", existing.id);
          } else {
            // Agent didn't call create-lead (short call, hang-up, etc.) — create minimal lead
            const newLead: Lead = {
              id: `lead_retell_${Date.now().toString(36)}`,
              parent_name: "",
              parent_email: "",
              parent_phone: call.from_number,
              child_name: "",
              child_dob: null,
              grade_interested: "",
              current_school: null,
              status: "new",
              interest_level: "cold",
              visit_date: null,
              visit_time: null,
              application_started: false,
              application_progress: 0,
              conversation_summary:
                call.call_analysis?.call_summary ||
                call.transcript?.slice(0, 500) ||
                "Inbound call — details not collected",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              follow_ups_sent: [],
            };
            addLead(newLead);
            console.log("[Retell] Created minimal lead:", newLead.id);
          }
        }
        break;

      case "call_analyzed":
        console.log("[Retell] Call analyzed:", call.call_id);

        // Update existing call record with analysis data
        const existingCall = retellCalls.find(
          (c) => c.call_id === call.call_id
        );
        if (existingCall) {
          existingCall.sentiment =
            call.call_analysis?.user_sentiment || existingCall.sentiment;
          existingCall.summary =
            call.call_analysis?.call_summary || existingCall.summary;
        }

        // Also update the lead's summary if we have better analysis now
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[Retell Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
