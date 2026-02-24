import { NextRequest, NextResponse } from "next/server";
import { addLead, findLeadByEmail, updateLead } from "@/lib/store";
import { Lead } from "@/lib/types";
import { Resend } from "resend";

const OVERRIDE_EMAIL = "nurturinglabs@gmail.com";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    parent_name,
    parent_email,
    parent_phone,
    child_name,
    child_dob,
    current_school,
    grade_applying_for,
  } = body;

  if (!parent_name || !parent_email || !parent_phone || !child_name || !child_dob || !grade_applying_for) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const applicationId = `APP-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const existingLead = findLeadByEmail(parent_email);

  if (existingLead) {
    updateLead(existingLead.id, {
      status: "applied",
      application_started: true,
      application_progress: 100,
      child_dob,
      current_school: current_school || existingLead.current_school,
      grade_interested: grade_applying_for,
      interest_level: "hot",
      updated_at: now,
      conversation_summary: `${existingLead.conversation_summary} Application submitted for Grade ${grade_applying_for}.`,
    });
  } else {
    const newLead: Lead = {
      id: `lead_${Date.now().toString(36)}`,
      parent_name,
      parent_email,
      parent_phone,
      child_name,
      child_dob,
      grade_interested: grade_applying_for,
      current_school: current_school || null,
      status: "applied",
      interest_level: "hot",
      visit_date: null,
      visit_time: null,
      application_started: true,
      application_progress: 100,
      conversation_summary: `Application submitted for Grade ${grade_applying_for} via voice agent.`,
      created_at: now,
      updated_at: now,
      follow_ups_sent: [],
    };
    addLead(newLead);
  }

  // Send application confirmation email
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "your_resend_api_key_here") {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ringaa Admissions <onboarding@resend.dev>",
        to: OVERRIDE_EMAIL,
        subject: `Application Received — ${child_name}, Grade ${grade_applying_for}`,
        text: [
          `Hi ${parent_name},`,
          ``,
          `Thank you for submitting an application to Brookfield International School.`,
          ``,
          `Application Details:`,
          `  Application ID: ${applicationId}`,
          `  Child: ${child_name}`,
          `  Date of Birth: ${child_dob}`,
          `  Grade: ${grade_applying_for}`,
          `  ${current_school ? `Current School: ${current_school}` : ""}`,
          ``,
          `Next Steps:`,
          `  1. Our admissions team will review your application`,
          `  2. You will be contacted to schedule a student interaction session`,
          `  3. Offer letter will be issued within 5 working days of the interaction`,
          ``,
          `If you have any questions, call us at +91 80456 78900.`,
          ``,
          `Warm regards,`,
          `Brookfield International School — Admissions Office`,
        ].join("\n"),
      });
    } catch (err) {
      console.error("Failed to send application confirmation email:", err);
    }
  }

  return NextResponse.json({
    success: true,
    application_id: applicationId,
    message: `Application for ${child_name} in Grade ${grade_applying_for} has been submitted successfully. A confirmation email has been sent.`,
  });
}
