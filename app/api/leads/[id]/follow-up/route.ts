import { NextRequest, NextResponse } from "next/server";
import { getLeadById, updateLead, followUpTemplates, getSeatByGrade } from "@/lib/store";
import { Resend } from "resend";

const OVERRIDE_EMAIL = "nurturinglabs@gmail.com";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { template: templateId, channel = "email" } = body;

  const lead = getLeadById(id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const template = followUpTemplates.find((t) => t.id === templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get seat info for template variables
  const seatInfo = getSeatByGrade(lead.grade_interested);

  // Replace template variables
  const replacements: Record<string, string> = {
    "{parent_name}": lead.parent_name,
    "{child_name}": lead.child_name,
    "{grade}": lead.grade_interested,
    "{visit_date}": lead.visit_date || "TBD",
    "{visit_time}": lead.visit_time || "TBD",
    "{available_seats}": seatInfo ? String(seatInfo.available) : "limited",
  };

  let subject = template.subject;
  let messageBody = template.body;

  for (const [key, value] of Object.entries(replacements)) {
    subject = subject.replaceAll(key, value);
    messageBody = messageBody.replaceAll(key, value);
  }

  // Send email via Resend
  let emailSent = false;
  let emailError: string | null = null;

  if (channel === "email" && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "your_resend_api_key_here") {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Ringaa Admissions <onboarding@resend.dev>",
        to: OVERRIDE_EMAIL,
        subject,
        text: messageBody,
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Failed to send email";
      console.error("Resend error:", emailError);
    }
  }

  // Record follow-up on the lead
  const followUp = {
    type: templateId,
    sent_at: new Date().toISOString(),
    channel,
  };

  updateLead(id, {
    follow_ups_sent: [...lead.follow_ups_sent, followUp],
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    channel,
    subject,
    body: messageBody,
    sent_at: followUp.sent_at,
    email_sent: emailSent,
    ...(emailError && { email_error: emailError }),
  });
}
