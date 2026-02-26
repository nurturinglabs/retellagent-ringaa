import { NextRequest, NextResponse } from "next/server";
import {
  addLead,
  findLeadByEmail,
  findLeadByPhone,
  updateLead,
} from "@/lib/store";
import { Lead } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[create-lead] Request body:", JSON.stringify(body));

    const {
      parent_name,
      child_name,
      parent_email,
      parent_phone,
      grade_interested,
      current_school,
    } = body;

    // Validate required fields — return 200 with friendly message (Retell needs 200)
    const missing: string[] = [];
    if (!parent_name) missing.push("parent's name");
    if (!child_name) missing.push("child's name");
    if (!parent_email) missing.push("parent's email address");
    if (!parent_phone) missing.push("parent's phone number");
    if (!grade_interested) missing.push("grade interested in");

    if (missing.length > 0) {
      console.log("[create-lead] Missing fields:", missing.join(", "));
      return NextResponse.json({
        success: false,
        error: `I still need the following to save your details: ${missing.join(", ")}. Could you provide ${missing.length === 1 ? "that" : "those"}?`,
        missing_fields: missing,
      });
    }

    const now = new Date().toISOString();

    // Check if lead already exists by email or phone
    const existing =
      findLeadByEmail(parent_email) || findLeadByPhone(parent_phone);

    if (existing) {
      updateLead(existing.id, {
        parent_name,
        child_name,
        parent_email,
        parent_phone,
        grade_interested,
        current_school: current_school || existing.current_school,
        status: "interested",
        interest_level: "warm",
        updated_at: now,
        conversation_summary: `Parent ${parent_name} called about admission for ${child_name} in Grade ${grade_interested}. Details updated via voice call.`,
      });

      console.log("[create-lead] Updated existing lead:", existing.id);

      return NextResponse.json({
        success: true,
        lead_id: existing.id,
        is_returning: true,
        message: `Thank you, ${parent_name}. I've updated your details. We have your interest noted for ${child_name} in Grade ${grade_interested}. Would you like to check seat availability, book a campus visit, or start an application?`,
      });
    }

    const newLead: Lead = {
      id: `lead_${Date.now().toString(36)}`,
      parent_name,
      parent_email,
      parent_phone,
      child_name,
      child_dob: null,
      grade_interested,
      current_school: current_school || null,
      status: "interested",
      interest_level: "warm",
      visit_date: null,
      visit_time: null,
      application_started: false,
      application_progress: 0,
      conversation_summary: `Parent ${parent_name} called about admission for ${child_name} in Grade ${grade_interested}. Lead captured via voice call.`,
      created_at: now,
      updated_at: now,
      follow_ups_sent: [],
    };

    addLead(newLead);
    console.log("[create-lead] Created new lead:", newLead.id);

    return NextResponse.json({
      success: true,
      lead_id: newLead.id,
      is_returning: false,
      message: `Thank you, ${parent_name}. I've saved your details. We have your interest noted for ${child_name} in Grade ${grade_interested}. Would you like to check seat availability, book a campus visit, or start an application?`,
    });
  } catch (error) {
    console.error("[create-lead] Error:", error);
    return NextResponse.json({
      success: false,
      message: "I had trouble saving your details, but don't worry — I've noted everything down. How can I help you today?",
    });
  }
}
