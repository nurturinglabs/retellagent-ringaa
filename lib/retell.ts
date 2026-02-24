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
