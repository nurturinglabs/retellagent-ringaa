import { NextRequest, NextResponse } from "next/server";
import {
  verifyRetellWebhookSignature,
  type RetellWebhookPayload,
} from "@/lib/retell";
import { addLead } from "@/lib/store";
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
    const signature = req.headers.get("x-retell-signature");

    // Verify signature when both API key and signature header are present
    const apiKey = process.env.RETELL_API_KEY;
    if (apiKey && signature) {
      const isValid = verifyRetellWebhookSignature(body, apiKey, signature);
      if (!isValid) {
        console.warn("[Retell] Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else if (apiKey && !signature) {
      // No signature header — reject in production, warn in dev
      if (process.env.NODE_ENV === "production") {
        console.warn("[Retell] Missing x-retell-signature header");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }
      console.warn("[Retell] No signature header — skipping verification (dev mode)");
    }

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

        // Create a lead from the call if we have caller info
        if (call.from_number) {
          const newLead: Lead = {
            id: `lead_retell_${Date.now().toString(36)}`,
            parent_name: call.from_number,
            parent_email: "",
            parent_phone: call.from_number,
            child_name: "",
            child_dob: null,
            grade_interested: "",
            current_school: null,
            status: "new",
            interest_level: "warm",
            visit_date: null,
            visit_time: null,
            application_started: false,
            application_progress: 0,
            conversation_summary:
              call.call_analysis?.call_summary ||
              call.transcript?.slice(0, 200) ||
              "Inbound call via Retell AI",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            follow_ups_sent: [],
          };
          addLead(newLead);
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
